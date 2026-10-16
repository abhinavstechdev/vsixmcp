import * as path from "node:path";
import * as vscode from "vscode";

/** Resolve an untrusted relative path and ensure it stays inside the workspace root. */
export function resolveWorkspacePath(root: vscode.Uri, relativePath: string): vscode.Uri {
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes("\0")) {
    throw new Error("A safe workspace-relative path is required.");
  }
  const rootPath = path.resolve(root.fsPath);
  const resolved = path.resolve(rootPath, relativePath);
  const rel = path.relative(rootPath, resolved);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error("Path is outside the current workspace.");
  }
  return vscode.Uri.file(resolved);
}

export function isProbablySensitive(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  const base = normalized.split("/").pop() ?? normalized;
  return base === ".env" ||
    base.startsWith(".env.") ||
    base.includes("secret") ||
    base.includes("credential") ||
    base.includes("private_key") ||
    base.endsWith(".pem") ||
    base.endsWith(".key") ||
    normalized.includes("/.ssh/") ||
    normalized.includes("/.aws/");
}
