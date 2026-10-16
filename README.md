# ChatGPT MCP Coder (`vsixmcp`)

An AI coding assistant for VS Code and compatible editors, designed to connect to MCP servers, inspect workspaces, propose precise code edits, and let developers review changes before applying them.

## Current status

The initial TypeScript VS Code extension scaffold is committed. The current GitHub Actions run has passed TypeScript type-checking, the focused security tests, the extension bundle build, and VSIX packaging. The workflow uploaded a VSIX artifact for this build.

This is an early foundation—not yet a complete implementation of every feature in the master development specification. In particular, automatic AI tool orchestration, full MCP tool permission policies, line-level structured patching, an undo/recovery workflow, streaming chat, and the Laravel/PostgreSQL backend remain incomplete.

## Current implemented foundation

- VS Code activity-bar view and chat Webview.
- OpenAI API request integration using the Responses API.
- API-key storage via VS Code SecretStorage.
- Commands to explain or request a proposal for selected code.
- Configurable model name, file-size limits, file-count limits, and ignore patterns.
- Workspace-relative path boundary validation.
- Basic filtering for common secret/credential paths.
- MCP client foundation for local stdio and remote HTTPS Streamable HTTP servers.
- MCP server configuration and explicit connection confirmation.
- MCP tool-list discovery/refresh foundation.
- Patch proposal helpers with expected-content hashing, native diff staging, and an approval prompt.
- CI workflow to install dependencies, type-check, run security tests, build, package a VSIX, and upload it as an artifact.

MCP tools are not yet automatically called by the chat agent. The current chat does not automatically inspect or transmit workspace files. Selected code is sent to the configured OpenAI model only when using the explain/edit-selection commands.

## Security principles

- Keep provider credentials in VS Code `SecretStorage`; never place API keys in source code or ordinary settings.
- Require approval for code modifications and terminal commands by default.
- Validate workspace-relative paths and prevent basic path traversal.
- Treat workspace files, MCP tool descriptions, and tool results as untrusted content.
- Do not run MCP tools just because a server advertises them.
- Make data sent to remote AI providers explicit and configurable.
- Never report a successful build, test, deployment, or MCP connection unless it actually succeeded.

## Repository structure

```text
vsixmcp/
├── README.md
├── .gitignore
├── package.json
├── .github/workflows/extension-ci.yml
├── apps/vscode-extension/
│   ├── package.json
│   ├── tsconfig.json
│   ├── esbuild.config.mjs
│   ├── resources/activity.svg
│   ├── src/
│   │   ├── extension.ts
│   │   ├── ai/openaiProvider.ts
│   │   ├── agent/orchestrator.ts
│   │   ├── mcp/manager.ts
│   │   ├── security/paths.ts
│   │   ├── security/patch.ts
│   │   └── workspace/context.ts
│   └── tests/
└── docs/
    ├── architecture.md
    ├── backend-deployment.md
    ├── installation.md
    ├── mcp-setup.md
    └── security.md
```

## Prerequisites

- Node.js 20+ and npm 10+ for extension development.
- A compatible VS Code version.
- An OpenAI API key for live provider use. A ChatGPT subscription does not automatically include API credits.
- PHP 8.3+, Composer, and PostgreSQL only when developing the planned optional backend.

## Development

From the repository root:

```bash
npm install
npm run check-types
npm test
npm run build
npm run package:vsix
```

The current focused Node.js security tests cover workspace path boundaries and common sensitive-path filters. They are not a replacement for VS Code extension-host integration tests or a full security audit.

## Install a verified VSIX

Download the `vsixmcp-extension` artifact from the successful [GitHub Actions run](https://github.com/abhinavstechdev/vsixmcp/actions/runs/38975716720). Extract the downloaded ZIP to obtain `vsixmcp-extension-0.1.0.vsix`.

Install it in VS Code using **Extensions → … → Install from VSIX…**, or run:

```bash
code --install-extension ./vsixmcp-extension-0.1.0.vsix
```

After installation, open the MCP Coder activity-bar view and run **ChatGPT MCP: Configure OpenAI API Key** from the Command Palette before sending a live request.

## Development roadmap

1. Complete a bounded AI agent loop with proper tool calling, streaming, cancellation, and usage reporting.
2. Finish MCP server management, schema validation, per-tool permissions, and error/reconnection handling.
3. Improve edit proposals into minimal line/range and multi-file patches with robust stale-change detection and recovery.
4. Add VS Code extension-host integration tests and package-content checks.
5. Implement the optional Laravel API, PostgreSQL migrations, authentication, authorization, quotas, and backend tests.
6. Continue security review before any production deployment.

## Backend hosting

The planned backend may be hosted on `voroa.com`, subject to the server's PHP, Composer, and PostgreSQL capabilities. The extension's supported local workflows should work when the backend is unavailable. No live deployment has been performed.

## Contributing

1. Create a branch for your change.
2. Keep changes focused and security-conscious.
3. Add or update tests for changed behavior.
4. Run the available checks and report skipped checks accurately.
5. Open a pull request describing behavior changes, tests, and known limitations.

## License

No license has been selected yet. Add a license file before distributing the project or accepting contributions under an open-source license.
