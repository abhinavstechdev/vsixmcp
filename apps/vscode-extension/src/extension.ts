import * as vscode from "vscode";
import { OpenAIProvider } from "./ai/openaiProvider";
import { McpManager, type McpServerConfig } from "./mcp/manager";
import { getWorkspaceSummary, readWorkspaceFile } from "./workspace/context";
import { createProposal, previewProposal, applyApprovedProposal } from "./security/patch";

class ChatViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  constructor(private readonly extensionUri: vscode.Uri, private readonly ai: OpenAIProvider) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [this.extensionUri] };
    view.webview.html = this.html();
    view.webview.onDidReceiveMessage(async (message: unknown) => {
      if (!message || typeof message !== "object" || !("type" in message)) return;
      const msg = message as { type: unknown; text?: unknown };
      if (msg.type !== "ask" || typeof msg.text !== "string") return;
      const prompt = msg.text.trim();
      if (!prompt || prompt.length > 12000) {
        view.webview.postMessage({ type: "error", text: "Enter a prompt of up to 12,000 characters." });
        return;
      }
      view.webview.postMessage({ type: "busy", value: true });
      try {
        const answer = await this.ai.ask(prompt);
        view.webview.postMessage({ type: "answer", text: answer });
      } catch (error) {
        view.webview.postMessage({ type: "error", text: error instanceof Error ? error.message : "Unknown provider error." });
      } finally {
        view.webview.postMessage({ type: "busy", value: false });
      }
    });
  }

  postPrompt(text: string): void {
    if (!this.view) {
      void vscode.commands.executeCommand("vsixmcp.openChat");
      return;
    }
    this.view.show?.(true);
    void this.view.webview.postMessage({ type: "prefill", text });
  }

  private html(): string {
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<title>ChatGPT MCP Coder</title>
<style nonce="${nonce}">
body{padding:12px;color:var(--vscode-foreground);font-family:var(--vscode-font-family)}
h2{font-size:1.1rem;margin:0 0 8px}.sub{color:var(--vscode-descriptionForeground);font-size:12px;margin-bottom:12px}
#log{display:flex;flex-direction:column;gap:10px;margin-bottom:12px}.msg{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid var(--vscode-panel-border);border-radius:6px;padding:9px}
.user{border-color:var(--vscode-focusBorder)}.err{color:var(--vscode-errorForeground)}
textarea{width:100%;min-height:86px;box-sizing:border-box;resize:vertical;padding:8px;color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border)}
button{margin-top:8px;padding:7px 10px;color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;border-radius:3px;cursor:pointer}
button:disabled{opacity:.6;cursor:wait}.row{display:flex;gap:8px;flex-wrap:wrap}
</style></head><body>
<h2>ChatGPT MCP Coder</h2>
<div class="sub">AI coding chat. API key stored in VS Code SecretStorage. File contents are only sent when you include them in your prompt.</div>
<div id="log" aria-live="polite"></div>
<textarea id="prompt" maxlength="12000" placeholder="Ask about code, explain an error, or request a change proposal…"></textarea>
<div class="row"><button id="send">Send</button><button id="clear" type="button">Clear chat</button></div>
<script nonce="${nonce}">
const vscode=acquireVsCodeApi();const log=document.getElementById('log');const input=document.getElementById('prompt');const sendButton=document.getElementById('send');
function add(text,cls=''){const node=document.createElement('div');node.className='msg '+cls;node.textContent=text;log.appendChild(node);node.scrollIntoView({block:'end'});}
function send(){const text=input.value.trim();if(!text||sendButton.disabled)return;add(text,'user');vscode.postMessage({type:'ask',text});input.value='';}
sendButton.addEventListener('click',send);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send();}});
document.getElementById('clear').addEventListener('click',()=>log.replaceChildren());
window.addEventListener('message',event=>{const m=event.data;if(!m||typeof m.type!=='string')return;if(m.type==='answer')add(String(m.text||''));if(m.type==='error')add(String(m.text||'Unknown error'),'err');if(m.type==='busy')sendButton.disabled=Boolean(m.value);if(m.type==='prefill'){input.value=String(m.text||'');input.focus();}});
</script></body></html>`;
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
}

async function configureMcpServer(context: vscode.ExtensionContext): Promise<void> {
  const name = await vscode.window.showInputBox({ title: "Add MCP server", prompt: "Unique server name", ignoreFocusOut: true });
  if (!name?.trim()) return;
  const transport = await vscode.window.showQuickPick([
    { label: "Remote Streamable HTTP", value: "streamable-http" },
    { label: "Local stdio process", value: "stdio" }
  ], { title: "Choose MCP transport" });
  if (!transport) return;
  let config: McpServerConfig;
  if (transport.value === "stdio") {
    const command = await vscode.window.showInputBox({ title: "MCP executable", prompt: "Exact executable path; inspect and trust this program before continuing", ignoreFocusOut: true });
    if (!command?.trim()) return;
    const argsText = await vscode.window.showInputBox({ title: "MCP arguments", prompt: "Optional arguments separated by spaces; shell operators are not interpreted." });
    config = { name: name.trim(), transport: "stdio", command: command.trim(), args: argsText?.trim() ? argsText.trim().split(/\s+/) : [], enabled: false };
  } else {
    const url = await vscode.window.showInputBox({ title: "MCP URL", prompt: "Use an HTTPS endpoint from a trusted server", placeHolder: "https://example.com/mcp", ignoreFocusOut: true });
    if (!url?.trim()) return;
    config = { name: name.trim(), transport: "streamable-http", url: url.trim(), enabled: false };
  }
  const stored = context.globalState.get<McpServerConfig[]>("vsixmcp.mcpServers", []);
  if (stored.some(s => s.name === config.name)) return void vscode.window.showErrorMessage("A server with that name is already configured.");
  await context.globalState.update("vsixmcp.mcpServers", [...stored, config]);
  void vscode.window.showInformationMessage(`Saved MCP server "${config.name}" disabled. Connect to it explicitly when you are ready.`);
}

export function activate(context: vscode.ExtensionContext): void {
  const ai = new OpenAIProvider(context.secrets);
  const chat = new ChatViewProvider(context.extensionUri, ai);
  const mcp = new McpManager();
  context.subscriptions.push(
    mcp,
    vscode.window.registerWebviewViewProvider("vsixmcp.chatView", chat, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.commands.registerCommand("vsixmcp.openChat", async () => {
      await vscode.commands.executeCommand("workbench.view.extension.vsixmcp");
    }),
    vscode.commands.registerCommand("vsixmcp.newConversation", () => chat.postPrompt("")),
    vscode.commands.registerCommand("vsixmcp.configureApiKey", () => ai.configureApiKey()),
    vscode.commands.registerCommand("vsixmcp.clearApiKey", () => ai.clearApiKey()),
    vscode.commands.registerCommand("vsixmcp.explainSelection", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return void vscode.window.showWarningMessage("Open a file and select code first.");
      const selected = editor.document.getText(editor.selection);
      if (!selected) return void vscode.window.showWarningMessage("Select some code first.");
      const relative = vscode.workspace.asRelativePath(editor.document.uri, false);
      chat.postPrompt(`Explain this selected code in ${relative}. Do not modify files.\n\n\`\`\`\n${selected.slice(0, 8000)}\n\`\`\``);
    }),
    vscode.commands.registerCommand("vsixmcp.editSelection", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return void vscode.window.showWarningMessage("Open a file and select code first.");
      const selected = editor.document.getText(editor.selection);
      if (!selected) return void vscode.window.showWarningMessage("Select some code first.");
      const relative = vscode.workspace.asRelativePath(editor.document.uri, false);
      chat.postPrompt(`Suggest a minimal edit for the selected code in ${relative}. Return proposed replacement code and an explanation. Do not apply any changes automatically.\n\n${selected.slice(0, 8000)}`);
    }),
    vscode.commands.registerCommand("vsixmcp.configureMcpServer", () => configureMcpServer(context)),
    vscode.commands.registerCommand("vsixmcp.connectMcpServer", async () => {
      const stored = context.globalState.get<McpServerConfig[]>("vsixmcp.mcpServers", []);
      if (!stored.length) return void vscode.window.showInformationMessage("Add an MCP server first.");
      const picked = await vscode.window.showQuickPick(stored.map(server => ({ label: server.name, description: server.transport, server })), { title: "Select MCP server" });
      if (!picked) return;
      const confirm = await vscode.window.showWarningMessage(`Trust and connect to "${picked.label}"?`, { modal: true, detail: "This will launch the configured executable or contact the remote endpoint." }, "Connect");
      if (confirm !== "Connect") return;
      try {
        const names = await mcp.connect({ ...picked.server, enabled: true } as McpServerConfig);
        void vscode.window.showInformationMessage(`Connected to ${picked.label}; discovered ${names.length} tool(s).`);
      } catch (error) {
        void vscode.window.showErrorMessage(error instanceof Error ? error.message : "MCP connection failed.");
      }
    }),
    vscode.commands.registerCommand("vsixmcp.refreshMcpTools", async (serverName?: string) => {
      const stored = context.globalState.get<McpServerConfig[]>("vsixmcp.mcpServers", []);
      const name = serverName ?? (await vscode.window.showQuickPick(stored.map(s => s.name), { title: "Select connected MCP server" }));
      if (!name) return;
      try {
        const tools = await mcp.listTools(name);
        const selected = await vscode.window.showQuickPick(tools.map(t => ({ label: t.name, description: t.description ?? "", detail: JSON.stringify(t.inputSchema).slice(0, 300) })), { title: `Tools on ${name}`, placeHolder: "Tool catalog retrieved from server" });
        void selected;
        void vscode.window.showInformationMessage(`Refreshed MCP tools for ${name}: ${tools.length} tool(s).`);
      } catch (error) {
        void vscode.window.showErrorMessage(error instanceof Error ? error.message : "Could not refresh MCP tools.");
      }
    }),
    vscode.commands.registerCommand("vsixmcp.workspaceSummary", async () => {
      const summary = await getWorkspaceSummary();
      void vscode.window.showInformationMessage(summary.slice(0, 500));
    }),
    vscode.commands.registerCommand("vsixmcp.readWorkspaceFile", async (relativePath: string) => {
      try { return await readWorkspaceFile(relativePath); }
      catch (error) {
        void vscode.window.showErrorMessage(error instanceof Error ? error.message : "Could not read file.");
        return undefined;
      }
    }),
    vscode.commands.registerCommand("vsixmcp.previewPatch", async (relativePath: string, replacement: string, reason = "AI-proposed change") => {
      const proposal = await createProposal(relativePath, replacement, reason);
      await previewProposal(proposal);
      const action = await vscode.window.showInformationMessage("Review the proposed change before applying it.", "Apply", "Reject");
      if (action === "Apply") {
        try { await applyApprovedProposal(proposal); }
        catch (error) { void vscode.window.showErrorMessage(error instanceof Error ? error.message : "Patch could not be applied."); }
      }
    })
  );
}

export function deactivate(): void {}
