import * as vscode from "vscode";
import { isProbablySensitive, resolveWorkspacePath } from "../security/paths";

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".jsonc", ".md",
  ".py", ".php", ".go", ".rs", ".java", ".kt", ".c", ".h", ".cpp", ".hpp",
  ".cs", ".html", ".css", ".scss", ".less", ".vue", ".svelte", ".yml", ".yaml",
  ".toml", ".ini", ".sql", ".sh", ".bash", ".ps1", ".xml", ".txt"
]);

export async function getWorkspaceSummary(): Promise<string> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) return "No workspace folder is open.";
  const cfg = vscode.workspace.getConfiguration("vsixmcp");
  const maxFiles = cfg.get<number>("context.maxFiles", 12);
  const ignores = cfg.get<string[]>("context.ignorePatterns", []);
  const excludeGlob = ignores.length ? `{${ignores.join(",")}}` : "**/node_modules/**";
  const uris = await vscode.workspace.findFiles("**/*", excludeGlob, Math.min(maxFiles, 100));
  const lines: string[] = [];
  for (const uri of uris) {
    const relative = vscode.workspace.asRelativePath(uri, false);
    if (isProbablySensitive(relative)) continue;
    lines.push(`- ${relative}`);
  }
  return `Workspace: ${folders.map(f => f.name).join(", ")}\nFiles found (names only; content has not been sent):\n${lines.length ? lines.join("\n") : "(no eligible files found)"}`;
}

export async function readWorkspaceFile(relativePath: string): Promise<string> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) throw new Error("Open a workspace folder first.");
  if (isProbablySensitive(relativePath)) throw new Error("This path appears sensitive and is excluded from AI context.");
  const target = resolveWorkspacePath(folders[0]!.uri, relativePath);
  const cfg = vscode.workspace.getConfiguration("vsixmcp");
  const maxBytes = cfg.get<number>("context.maxFileSize", 100000);
  const stat = await vscode.workspace.fs.stat(target);
  if (stat.size > maxBytes) throw new Error("File exceeds the configured context size limit.");
  const bytes = await vscode.workspace.fs.readFile(target);
  const content = Buffer.from(bytes).toString("utf8");
  if (content.includes("\u0000")) throw new Error("Binary files are not supported as text context.");
  return content;
}
