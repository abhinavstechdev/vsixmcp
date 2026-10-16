# Architecture

## Design boundary

The VS Code extension host is responsible for workspace access, editor integration, MCP connections, approval prompts, patch application, and orchestration. The optional backend is not a relay for local file operations.

```text
VS Code UI / Webview
       │ validated messages
       ▼
Extension host
  ├── Agent orchestrator (bounded loop)
  ├── AI provider adapter
  ├── MCP client manager
  ├── Workspace tools (sandboxed to workspace)
  ├── Patch proposal and validation engine
  ├── Native diff / approval workflow
  └── SecretStorage
       │ optional authenticated HTTPS
       ▼
Laravel API ─── PostgreSQL
```

## Trust boundaries

- Webview messages are untrusted and must be validated before reaching the extension host.
- Workspace content, files, comments, tool descriptions, and tool results are untrusted data, not policy instructions.
- MCP servers are explicitly configured and individually enabled by the user.
- Remote AI requests may transmit only the context required for the current request; never upload the whole workspace by default.
- Secrets stay out of Webview state, logs, telemetry, repository files, and regular settings.

## Editing lifecycle

1. Inspect files and editor context that are relevant to the task.
2. Generate a patch proposal with workspace-relative paths, expected content/version, replacement, reason, and risk level.
3. Validate paths and expected content; reject stale or ambiguous proposals.
4. Show changes in the native diff workflow.
5. Apply only approved proposals, using version-aware editor operations.
6. Verify the resulting content and report actual outcomes.
7. Run configured tests or commands only after the required authorization.

## Agent limits

Configure maximum iterations, elapsed time, and tool calls. Every tool call must be permission-checked and have argument validation and a timeout. Cancellation should propagate to active provider and tool operations when supported.

## Optional backend

Laravel and PostgreSQL may store user settings, conversations, server metadata, and usage records. The backend must not expose arbitrary tool execution or arbitrary MCP URL access through unauthenticated endpoints. Local coding workflows should work without the backend for supported features.

## Implementation status

This document describes the intended architecture. It does not assert that these components are already implemented.
