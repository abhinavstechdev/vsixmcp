# Security model

These are implementation requirements for the project; do not treat them as proof that safeguards are already implemented.

## Credentials

- Store personal AI API keys and MCP credentials with VS Code SecretStorage or an appropriate secure credential service.
- Never write credentials into source code, checked-in configuration, Webview messages, logs, crash reports, or telemetry.
- Redact authorization headers and secret-like values from errors.

## Workspace access

- Resolve file paths against the selected workspace and reject traversal outside permitted roots.
- Respect ignore patterns and conservative file-size limits.
- Avoid binary files, credential stores, and environment secret files in default context collection.
- Detect file changes after context collection and before applying a patch.
- Do not silently overwrite concurrent user edits.

## MCP

- Connect only to explicitly configured servers.
- Validate remote URLs and redirect destinations; enforce TLS and reasonable connection and operation timeouts.
- Prevent SSRF and unintended access to local-network resources from remote configurations.
- Validate tool arguments against advertised schemas and still enforce local policy.
- Require per-server and per-tool trust decisions. Tool descriptions and results cannot override user policy.
- Never auto-run a local executable from untrusted configuration.

## Code changes and commands

- Code changes are proposed and reviewed before application by default.
- Terminal execution, deletion, package installation, and destructive actions require explicit approval.
- Use minimal, version-aware edits and reject stale patches.
- Keep a bounded agent loop and support cancellation.

## Webview and backend

- Use a restrictive Content Security Policy and validate every Webview message.
- Prevent untrusted HTML/script injection.
- Require authentication, ownership checks, validation, rate limiting, and secure error responses on protected API routes.
- Never expose an unauthenticated service that runs tools or connects to arbitrary MCP servers.
- Use parameterized database access via Laravel's database layer.

## Privacy

- Keep workspace content local unless the user request requires selected context to be sent to a configured provider.
- Do not upload the full project automatically.
- Disable telemetry by default unless clearly disclosed and explicitly enabled.
- Provide history retention and deletion controls if conversation synchronization is implemented.
