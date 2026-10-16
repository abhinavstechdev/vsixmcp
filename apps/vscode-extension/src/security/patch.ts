import * as crypto from "node:crypto";
import * as vscode from "vscode";
import { resolveWorkspacePath, isProbablySensitive } from "./paths";

export interface PatchProposal {
  relativePath: string;
  expectedSha256: string;
  expectedContent: string;
  replacementContent: string;
  reason: string;
}
export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}
export async function createProposal(relativePath: string, replacementContent: string, reason: string): Promise<PatchProposal> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) throw new Error("Open a workspace before proposing a patch.");
  if (isProbablySensitive(relativePath)) throw new Error("Sensitive paths cannot be modified by the AI patch workflow.");
  const uri = resolveWorkspacePath(folders[0]!.uri, relativePath);
  const document = await vscode.workspace.openTextDocument(uri);
  const expectedContent = document.getText();
  return { relativePath, expectedSha256: sha256(expectedContent), expectedContent, replacementContent, reason };
}
/** Opens a native diff preview using temporary untitled documents; the target file is unchanged. */
export async function previewProposal(proposal: PatchProposal): Promise<void> {
  const original = vscode.Uri.parse(`untitled:${proposal.relativePath}.vsixmcp-original`);
  const proposed = vscode.Uri.parse(`untitled:${proposal.relativePath}.vsixmcp-proposed`);
  const originalDoc = await vscode.workspace.openTextDocument(original);
  const proposedDoc = await vscode.workspace.openTextDocument(proposed);
  const originalEdit = new vscode.WorkspaceEdit();
  originalEdit.insert(original, new vscode.Position(0, 0), proposal.expectedContent);
  const proposedEdit = new vscode.WorkspaceEdit();
  proposedEdit.insert(proposed, new vscode.Position(0, 0), proposal.replacementContent);
  if (!await vscode.workspace.applyEdit(originalEdit) || !await vscode.workspace.applyEdit(proposedEdit)) {
    throw new Error("Could not prepare temporary diff documents.");
  }
  await vscode.commands.executeCommand("vscode.diff", originalDoc.uri, proposedDoc.uri, `Proposed: ${proposal.relativePath} — ${proposal.reason}`);
}
export async function applyApprovedProposal(proposal: PatchProposal): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) throw new Error("Workspace is no longer available.");
  if (isProbablySensitive(proposal.relativePath)) throw new Error("Sensitive paths cannot be modified.");
  const uri = resolveWorkspacePath(folders[0]!.uri, proposal.relativePath);
  const document = await vscode.workspace.openTextDocument(uri);
  const currentContent = document.getText();
  if (sha256(currentContent) !== proposal.expectedSha256) {
    throw new Error("The target file changed after this proposal was created. Read the current file and create a new proposal.");
  }
  const confirm = await vscode.window.showWarningMessage(
    `Apply the proposed AI edit to ${proposal.relativePath}?`,
    { modal: true, detail: proposal.reason },
    "Apply edit"
  );
  if (confirm !== "Apply edit") return;
  const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(currentContent.length));
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, fullRange, proposal.replacementContent);
  const applied = await vscode.workspace.applyEdit(edit);
  if (!applied) throw new Error("VS Code rejected the edit; the file was not changed.");
  await document.save();
}
