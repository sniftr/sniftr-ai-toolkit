# Claude Code Provider

The Claude Code provider packages Sniftr skills as a Claude Code plugin.
It also bundles Sniftr's hosted MCP servers for logpoints and admin
operations.

Read application logs through your existing AI Agent logs integration, typically
an MCP connected to your logging provider.

## Install From Claude Code

Add the GitHub marketplace and install the plugin:

```text
/plugin marketplace add sniftr/sniftr-ai-toolkit
/plugin install sniftr@sniftr-ai-toolkit
```

## Package Contents

- `.claude-plugin/plugin.json` identifies the Claude Code plugin.
- `skills/` is synced from the shared Sniftr skills.
- `.mcp.json` registers Sniftr's hosted MCP endpoints.

The repository-root `.claude-plugin/marketplace.json` exposes this provider
package to Claude Code.

## Validate

```sh
npm run validate:claude
```
