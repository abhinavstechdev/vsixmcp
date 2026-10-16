# Development and packaging

## Current status

The repository currently contains project documentation only. The installable VS Code extension scaffold, build scripts, test suite, and VSIX artifact have not yet been created or verified.

## Intended prerequisites

- Node.js LTS and npm
- A supported VS Code version
- An OpenAI API key for live provider tests (not required for mocked unit tests)
- `@vscode/vsce` for VSIX packaging
- PHP 8.3+, Composer, and PostgreSQL only for optional backend work

## Planned validation sequence

Once the extension scaffold exists, run the repository's actual scripts for:

1. Dependency installation using the lockfile.
2. TypeScript type-checking.
3. Extension and Webview builds.
4. Automated tests (record skipped tests separately).
5. Linting and package-content validation.
6. VSIX packaging using `vsce package`.
7. Confirm the expected `.vsix` file exists and can be inspected.

Do not infer that any check passed merely because a script is documented.

## Installing a verified VSIX

When a `.vsix` artifact has been generated, install it through VS Code's Extensions view menu using **Install from VSIX...**, or with:

```bash
code --install-extension <path-to-verified-package.vsix>
```

The placeholder is not an existing artifact. Replace it with the actual generated package path.
