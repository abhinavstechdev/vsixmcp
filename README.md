# ChatGPT MCP Coder (`vsixmcp`)

An AI coding assistant for VS Code and compatible editors, designed to connect to MCP servers, inspect workspaces, propose precise code edits, and let developers review changes before applying them.

> **Status:** Project foundation and architecture specification. This repository is not yet a complete or packaged VS Code extension. Features are implemented and verified only when noted explicitly in project documentation and tests.

## Goals

- VS Code extension written in TypeScript.
- AI provider abstraction, initially targeting the OpenAI API.
- MCP client support for explicitly configured local stdio and remote Streamable HTTP servers.
- Workspace-aware coding assistance with line/range edits and multi-file proposals.
- Native diff review, explicit approval, stale-change detection, and recovery.
- Optional Laravel/PHP backend with PostgreSQL for accounts, settings, conversations, and usage.
- Local-first code context: do not upload the entire workspace automatically.

## Security principles

- Keep provider credentials in VS Code `SecretStorage`; never place API keys in source code or ordinary settings.
- Require approval for code modifications and terminal commands by default.
- Validate workspace-relative paths and prevent path traversal.
- Treat workspace files, MCP tool descriptions, and tool results as untrusted content.
- Do not run MCP tools just because a server advertises them.
- Make data sent to remote AI providers explicit and configurable.
- Never report a successful build, test, deployment, or MCP connection unless it actually succeeded.

## Planned repository structure

```text
vsixmcp/
├── README.md
├── LICENSE
├── .gitignore
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── .vscodeignore
├── apps/
│   ├── vscode-extension/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── extension.ts
│   │   │   ├── ai/
│   │   │   ├── agent/
│   │   │   ├── mcp/
│   │   │   ├── workspace/
│   │   │   ├── patches/
│   │   │   ├── review/
│   │   │   └── security/
│   │   ├── webview/
│   │   └── tests/
│   └── backend/
│       ├── app/
│       ├── routes/
│       ├── database/migrations/
│       └── tests/
├── packages/
│   ├── shared-types/
│   └── patch-engine/
└── docs/
    ├── architecture.md
    ├── mcp-setup.md
    ├── security.md
    └── backend-deployment.md
```

This is the intended structure; directories will be added as their implementation begins.

## Development roadmap

1. **Foundation:** VS Code extension manifest, TypeScript build, commands, and sidebar.
2. **AI provider:** secure API-key configuration, streaming, tool calling, cancellation, and error handling.
3. **MCP:** server configuration, supported transports, tool discovery/refresh, argument validation, and permissions.
4. **Code editing:** workspace inspection, minimal patch proposals, native diff preview, acceptance/rejection, stale-patch detection, and undo.
5. **Agent loop:** bounded orchestration, progress updates, diagnostics, and approved test execution.
6. **Backend (optional):** Laravel APIs, PostgreSQL migrations, authentication, ownership checks, rate limits, and tests.
7. **Validation and release:** automated tests, security checks, VSIX packaging, and installation documentation.

## Prerequisites (planned)

- A supported VS Code release.
- Node.js and npm for extension development.
- An OpenAI API key for live OpenAI requests; a ChatGPT subscription does not automatically provide API credits.
- PHP 8.3+ and Composer only when developing the optional Laravel backend.
- PostgreSQL only when enabling backend persistence.

## Initial setup

Once the extension scaffold and package scripts have been implemented, setup instructions will be documented here. Do not assume the repository is installable as a VSIX yet.

## Testing and packaging

The intended release checks are TypeScript type-checking, build, automated tests, linting, package-content validation, and `vsce package`. Record the actual command and result for each check before claiming it passed. A VSIX should be linked as a release artifact only after it has been generated and verified.

## Backend hosting

The planned backend may be hosted on `voroa.com`, subject to the server's PHP, Composer, and PostgreSQL capabilities. The VS Code extension's supported local workflows should continue to work when the backend is unavailable. Do not deploy to production or run destructive database operations without explicit authorization.

## Contributing

1. Create a branch for your change.
2. Keep changes focused and security-conscious.
3. Add or update tests for changed behavior.
4. Run the available checks and report skipped checks accurately.
5. Open a pull request describing behavior changes, tests, and any known limitations.

## License

No license has been selected yet. Add a license file before distributing the project or accepting contributions under an open-source license.
