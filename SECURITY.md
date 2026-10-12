# Security

Sniftr diagnostics can expose runtime state, logs, customer metadata, and
internal service details. Treat toolkit changes as security-sensitive.

## Reporting Issues

Please report security issues privately to [support@sniftr.ai](mailto:support@sniftr.ai)
rather than opening a public issue.

## Guidance for Skills

Sniftr provides configurable guardrails to help prevent sensitive information
from being logged. Skills must not rely on those guardrails alone. Before
creating a logpoint, ensure its message and expressions do not include or expose
sensitive information. This defense-in-depth approach reduces the chance of
accidental disclosure.
