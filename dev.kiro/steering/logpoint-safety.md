# Sniftr Logpoint Safety

Sniftr logpoints are read-only runtime instrumentation. Keep them targeted,
low-noise, and scoped to the investigation.

## Placement

Place logpoints on executable lines where the needed values are already in
scope. Logpoints evaluate before the selected line executes: parameters and
fields are available at method entry, while locals are available only after
their declaration or assignment has already executed.

If the state of interest is not available at a candidate line, move the point to
where that state is computed, passed, branched on, transformed, or returned.

## Messages

Keep messages concise and diagnostic. Sniftr application logs already include a
`[LOGPOINT <short-id>]` prefix and provider metadata, so the configured message
should focus on the investigation-specific label and facts.

Prefer messages like:

```text
decision userId={userId} state={state}
```

Avoid broad object dumps, secrets, tokens, credentials, personal data, large
collections, or expensive expressions. Use only values needed to narrow the
runtime question.

## Conditions

Use conditions to reduce noise and target relevant requests or state. Conditions
should control emission, not replace the diagnostic message.

Prefer scoped conditions like:

```text
requestId == "req-1842"
```

Avoid high-volume unconditional points on hot loops or request paths unless the
user explicitly accepts the noise and operational risk.
