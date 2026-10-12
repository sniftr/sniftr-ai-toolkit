# Sniftr Runtime Debugging Workflow

Use Sniftr for tasks that require observing live application runtime behavior,
especially deployed, remote, intermittent, or environment-specific behavior. Do
not use it for tasks fully answerable by static code review or ordinary log
analysis alone.

Currently, only Java / JVM is supported. Read the
[Java compatibility guide](../../skills/sniftr-runtime-debugging/references/logpoint-compatibility-java.md)
before composing logpoint expressions.

## Plan The Debugging Approach

Clarify the symptom, expected behavior and reproduction context. Inspect the
relevant source and choose logpoints that test your debugging hypotheses.
Follow the shared skill's
[location and evaluation-timing guidance](../../skills/sniftr-runtime-debugging/SKILL.md#2-plan-the-debugging-approach).

## Create And Observe

Use the current Sniftr MCP tool schemas and returned guidance. Keep logpoints
focused and read-only, use inexpensive expressions, and avoid emitting secrets
or sensitive data. Follow `statusReason` to decide how to proceed.
Respect policy and read-only restrictions; do not try equivalent rewrites to bypass them. If no permitted observation answers the question, continue with other evidence. A typical flow is:

1. Select the target environment.
2. Select the intended app using the current tool filters. If no app matches, verify the environment and filters; report a confirmed missing agent connection instead of substituting another app.
3. Check whether existing logpoints already cover the question.
4. Fetch `list_expression_rules` before composing the first message/condition, reuse them for the session, and create or update targeted logpoints. Refresh only for changed policy context or evidence of stale rules.
5. Confirm the points are active or otherwise accepted by the runtime.
6. Ask the user to reproduce only after the instrumentation is ready.
7. Use your available logs integration to search log message text for `[LOGPOINT <short-id>]` within the relevant time window. Use the logpoint’s short ID in the message; do not rely on a structured `logpoint_id` or `logpointId` field.
8. Before refining instrumentation, state what you learned, what remains uncertain, and which observation would resolve it. Remove superseded points as you narrow the search.

When drawing conclusions, cite the observed runtime evidence: which logpoints
emitted, which values appeared, which branches executed, and how that maps back
to source.

## Cleanup

Remove temporary logpoints when the investigation is complete or when they are
no longer needed. If you leave a logpoint active, explain why and note any
scope or condition that keeps it safe.
