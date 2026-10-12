# Sniftr AI Toolkit — PREVIEW

**The live debugging MCP for coding agents.**

Sniftr gives coding agents access to live runtime evidence when source code,
existing logs, and metrics are not enough to explain an application's behavior.

Through Sniftr MCP, agents add **dynamic logpoints**: temporary, read-only logging
instructions that capture execution paths, variable values, and application
state. With the Sniftr runtime agent installed, logpoints can be added and removed
without source changes, rebuilds, or restarts. The resulting evidence helps
AI agents diagnose issues, prepare fixes, and verify behavior after deployment.

This plugin connects your AI coding assistant to Sniftr MCP and includes the
[`sniftr-runtime-debugging` skill](skills/sniftr-runtime-debugging/SKILL.md) for
planning investigations, managing logpoints, and interpreting results. The
plugin is available for **Codex, Claude Code, Cursor, and AWS Kiro**.

## Before you start

Before starting an investigation, complete the following setup:

1. **Sniftr account.** Contact [support@sniftr.ai](mailto:support@sniftr.ai) for account
   access and onboarding.
2. **Sniftr agent.** Install and connect the Sniftr runtime agent in your
   application. Java is currently supported; follow the
   [Java agent setup guide](https://github.com/sniftr/sniftr-agent-java#installation).
3. **Sniftr MCP and skill.** Install the plugin for your AI coding assistant
   using the [installation instructions below](#installation). The plugin bundles
   the MCP connections and debugging skill. Complete the Sniftr sign-in flow
   when prompted.

## Installation

Follow the instructions for your coding assistant.

### Codex

Add the marketplace and install the plugin from your terminal:

```sh
codex plugin marketplace add sniftr/sniftr-ai-toolkit
codex plugin add sniftr@sniftr
```

### Claude Code

Add the marketplace and install the plugin inside Claude Code:

```text
/plugin marketplace add sniftr/sniftr-ai-toolkit
/plugin install sniftr@sniftr-ai-toolkit
```

### Cursor

Add the marketplace, then start Cursor Agent:

```sh
cursor-agent plugin marketplace add https://github.com/sniftr/sniftr-ai-toolkit
cursor-agent
```

In Cursor Agent, enter `/plugin`, open the marketplace, select **sniftr**, and
choose user or project scope. You can also import
[`sniftr/sniftr-ai-toolkit`](https://github.com/sniftr/sniftr-ai-toolkit) through
Cursor's **Customize** view.

### AWS Kiro

1. Open the **Powers** panel and click **Add Custom Power**.
2. Select **Import power from GitHub**.
3. Enter `https://github.com/sniftr/sniftr-ai-toolkit`.
4. Click **Install**.

To install from a local checkout, choose **Import power from a folder** and
select the repository root (`sniftr-ai-toolkit/`).

## Using the plugin

When prompted, sign in to Sniftr to authenticate the bundled MCP connections:

| Connection | Purpose | Endpoint |
| --- | --- | --- |
| `sniftr-logpoints` | Inspect and manage runtime logpoints | `https://mcp.sniftr.ai/logpoints` |
| `sniftr-admin` | Sniftr administration | `https://mcp.sniftr.ai/admin` |

Logpoint output remains in your existing logging platform and does not pass
through Sniftr. Your coding assistant reads it through a separate logging
integration or other authorized log access. Sniftr does not provide a log
retrieval MCP server.

Make the application's source code available to your assistant when placing
logpoints. To begin an investigation, describe the symptom, identify the
application and environment, and specify where logs are available. For example:

> Use Sniftr to investigate why order-service rejects checkout requests in
> staging. Application logs are available through our connected logging platform.

You can also ask your assistant to manage logpoints:

- “List the Sniftr logpoints for order-service in staging.”
- “Remove the temporary Sniftr logpoints created during this investigation.”

## Contact and support

- **Questions and onboarding:** Contact [support@sniftr.ai](mailto:support@sniftr.ai).
- **Bugs and feature requests:** Open a
  [GitHub issue](https://github.com/sniftr/sniftr-ai-toolkit/issues).
- **Security concerns:** Report privately to [support@sniftr.ai](mailto:support@sniftr.ai).
  See [SECURITY.md](SECURITY.md) for guidance.

This toolkit is licensed under [Apache-2.0](LICENSE). For contributor setup and
provider validation, see [CONTRIBUTING.md](CONTRIBUTING.md).
