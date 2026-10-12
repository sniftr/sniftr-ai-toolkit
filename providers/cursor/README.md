# Cursor Provider

The Cursor provider packages Sniftr skills as an Agent Plugin for Cursor.
It also bundles Sniftr's hosted MCP servers for logpoints and admin
operations.

Read application logs through your existing AI Agent logs integration, typically
an MCP connected to your logging provider.

## Install From GitHub

```sh
cursor-agent plugin marketplace add https://github.com/sniftr/sniftr-ai-toolkit
cursor-agent
```

Then enter `/plugin`, open the marketplace, select `sniftr`, and install it at
user or project scope.

The repository-root `.cursor-plugin/marketplace.json` points Cursor to this
provider package. The same GitHub repository can also be imported through
Cursor's Customize view.

## Package Contents

- `plugin.json` identifies the plugin using the Agent Plugins standard that
  Cursor supports.
- `.cursor-plugin/plugin.json` identifies the Cursor-specific plugin package.
- `skills/` is synced from the shared Sniftr skills.
- `mcp.json` registers Sniftr's hosted MCP endpoints.

## Validate

```sh
npm run validate:cursor
```
