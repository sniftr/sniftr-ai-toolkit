# Codex Provider

The Codex provider packages Sniftr skills as a Codex plugin.
It also bundles Sniftr's hosted MCP servers for logpoints and admin
operations.

Read application logs through your existing AI Agent logs integration, typically
an MCP connected to your logging provider.

## Install From GitHub

```sh
codex plugin marketplace add sniftr/sniftr-ai-toolkit
codex plugin add sniftr@sniftr
```

The repository-root `.agents/plugins/marketplace.json` points Codex to this
provider package.

## Validate

```sh
npm run prepare:skills
npm run validate:codex
```

Run these commands from the repository root. They prepare provider files and
check version consistency and required package files. Test installation and use
in Codex separately. See [contributing guidance](../../CONTRIBUTING.md#codex-validation)
for the scope of these checks.
