# granola-mcp

MCP server that exposes [Granola](https://granola.ai) meeting notes from the local cache.

## Tools

- `list_notes` - List meetings with optional filters (limit, offset, date range)
- `get_note` - Get note title and summary
- `get_transcript` - Get full transcript

## Build

```bash
pnpm install
pnpm build
```

## Use with Claude Code

```bash
claude mcp add granola-mcp node /path/to/granola-mcp/dist/index.js
```

Verify:
```bash
claude mcp list
```
