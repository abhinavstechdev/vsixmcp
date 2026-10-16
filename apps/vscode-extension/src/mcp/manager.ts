import * as vscode from "vscode";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export type McpServerConfig =
  | { name: string; transport: "stdio"; command: string; args?: string[]; enabled?: boolean }
  | { name: string; transport: "streamable-http"; url: string; enabled?: boolean };

type ConnectedServer = { client: Client; transport: { close(): Promise<void> } };

export class McpManager implements vscode.Disposable {
  private readonly connected = new Map<string, ConnectedServer>();

  async connect(config: McpServerConfig): Promise<string[]> {
    if (!config.enabled) throw new Error("MCP server is disabled. Enable it explicitly before connecting.");
    if (!config.name.trim()) throw new Error("MCP server name is required.");
    await this.disconnect(config.name);
    const client = new Client({ name: "vsixmcp", version: "0.1.0" });
    let transport: StdioClientTransport | StreamableHTTPClientTransport;
    if (config.transport === "stdio") {
      if (!config.command.trim() || config.command.includes("\0")) throw new Error("An explicit local executable path is required.");
      transport = new StdioClientTransport({ command: config.command, args: config.args ?? [], stderr: "pipe" });
    } else {
      const url = new URL(config.url);
      if (url.protocol !== "https:") throw new Error("Remote MCP servers must use HTTPS.");
      if (url.username || url.password) throw new Error("Credentials must not be embedded in the MCP URL.");
      transport = new StreamableHTTPClientTransport(url);
    }
    try {
      await client.connect(transport);
      const result = await client.listTools();
      this.connected.set(config.name, { client, transport });
      return result.tools.map(tool => tool.name);
    } catch (error) {
      try { await transport.close(); } catch { /* preserve original failure */ }
      throw new Error(`Failed to connect to MCP server "${config.name}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listTools(serverName: string): Promise<Array<{ name: string; description?: string; inputSchema: unknown }>> {
    const server = this.connected.get(serverName);
    if (!server) throw new Error(`MCP server "${serverName}" is not connected.`);
    const result = await server.client.listTools();
    return result.tools.map(tool => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema }));
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const server = this.connected.get(serverName);
    if (!server) throw new Error(`MCP server "${serverName}" is not connected.`);
    if (!toolName.trim()) throw new Error("An explicit tool name is required.");
    // The caller must validate schema and obtain any required user authorization before invoking.
    return await server.client.callTool({ name: toolName, arguments: args });
  }

  async disconnect(serverName: string): Promise<void> {
    const server = this.connected.get(serverName);
    if (!server) return;
    this.connected.delete(serverName);
    await server.transport.close();
  }

  async refresh(serverName: string): Promise<string[]> {
    return (await this.listTools(serverName)).map(tool => tool.name);
  }

  async disposeAsync(): Promise<void> {
    await Promise.all([...this.connected.keys()].map(name => this.disconnect(name).catch(() => undefined)));
  }

  dispose(): void { void this.disposeAsync(); }
}
