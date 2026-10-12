# AWS Kiro Provider

The repository root is the installable Kiro Power using the Agent Plugins
format. This directory contains provider notes only.

Read application logs through your existing AI Agent logs integration, typically
an MCP connected to your logging provider.

## Install As A Kiro Power

To install from GitHub, use Kiro's Powers panel:

1. Click **Add Custom Power**.
2. Select **Import power from GitHub**.
3. Enter `https://github.com/sniftr/sniftr-ai-toolkit`.
4. Click **Install**.

Kiro Powers follow the Agent Plugins format. The repository root contains
`plugin.json`, `mcp.json`, `skills/`, and `dev.kiro/steering/`.

For local development, choose **Import power from a folder** in Kiro's Powers panel and select
the repository root (`sniftr-ai-toolkit/`).

Kiro IDE 1.2.56 checks for `plugin.json` or `POWER.md` directly in the selected
folder. Maintain `plugin.json`, `mcp.json`, and `dev.kiro/steering/` at the root
so users can select the whole repository. Kiro uses the shared root `skills/`
directly; `prepare:skills` generates copies only for the other providers.

## One-Click MCP Links

Kiro supports one-click MCP install links for individual servers:

- [Add sniftr-logpoints to Kiro](https://kiro.dev/launch/mcp/add?name=sniftr-logpoints&config=%7B%22url%22%3A%22https%3A%2F%2Fmcp.sniftr.ai%2Flogpoints%22%2C%22disabled%22%3Afalse%2C%22autoApprove%22%3A%5B%5D%7D)
- [Add sniftr-admin to Kiro](https://kiro.dev/launch/mcp/add?name=sniftr-admin&config=%7B%22url%22%3A%22https%3A%2F%2Fmcp.sniftr.ai%2Fadmin%22%2C%22disabled%22%3Afalse%2C%22autoApprove%22%3A%5B%5D%7D)

## Package Contents

- Root `plugin.json` identifies the Kiro Power.
- Root `mcp.json` registers Sniftr's hosted MCP endpoints for the Power.
- Root `skills/` contains the shared Sniftr runtime debugging skill.
- Root `dev.kiro/steering/` contains Kiro-specific steering guidance.

## Validate

```sh
npm run prepare:skills
npm run validate:kiro
```

Validation checks the repository-root Power files and directories.
