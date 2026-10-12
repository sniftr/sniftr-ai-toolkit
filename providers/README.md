# Providers

Provider folders adapt the shared Sniftr toolkit to each agent environment.

Repository-level marketplace manifests are maintained at:

- `.agents/plugins/marketplace.json` for Codex.
- `.claude-plugin/marketplace.json` for Claude Code.
- `.cursor-plugin/marketplace.json` for Cursor.

- `codex/` contains the Codex plugin package.
- `claude/` contains the Claude Code plugin package.
- `cursor/` contains the Cursor plugin package.
- `kiro/` contains AWS Kiro provider notes. The repository root is the Kiro
  Power package.

Author shared investigation guidance in the `sniftr` repository. Root `skills/`
here contains its synced distribution copies. This repository runs
`npm run prepare:skills` to prepare Codex, Claude Code, and Cursor skill folders
before local install, validation, or packaging. Kiro uses the root `skills/`
directory directly. Do not edit any of these skill copies independently.
