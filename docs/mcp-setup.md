# MCP setup guide

This guide describes the planned configuration model. Actual transports and controls must be validated in implementation and tests before being described as supported.

## Local stdio servers

A local stdio server must be explicitly configured by the user. The extension should launch only an approved executable and explicit argument list; it must not execute shell strings or commands copied from untrusted project files. Review the executable path and arguments before saving configuration.

Illustrative configuration shape (replace placeholders and verify compatibility with the implemented settings schema):

```json
{
  "name": "example-local-server",
  "transport": "stdio",
  "command": "<approved-executable-path>",
  "args": ["<approved-argument>"],
  "enabled": false
}
```

## Remote Streamable HTTP servers

Use the server's documented HTTPS endpoint and authentication method. Verify the hostname and permissions before connecting. Store credentials in secure storage, not in the URL or a checked-in JSON file. Do not pass credentials across redirect destinations.

Illustrative configuration shape:

```json
{
  "name": "example-remote-server",
  "transport": "streamable-http",
  "url": "https://<trusted-host>/<mcp-path>",
  "enabled": false
}
```

## Tool discovery and use

1. Connect to an explicitly enabled server.
2. Retrieve tools using the MCP SDK version implemented by the project.
3. Show tool names, descriptions, input schemas, and connection errors to the user.
4. Validate arguments against schemas and local policy.
5. Ask for authorization when required by the configured permission policy.
6. Show results and failures accurately.

Refreshing the catalog must perform a real protocol operation. Do not report success if connection, discovery, or validation fails.

## Troubleshooting

- Check the server endpoint or local executable path.
- Check authentication and permissions.
- Check that the selected transport is supported by both sides.
- Review timeout and TLS errors.
- Retry after resolving the cause; do not suppress the original error.
