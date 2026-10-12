---
name: sniftr-runtime-debugging
description: >-
  Investigate running applications with read-only Sniftr logpoints, without
  changing code, rebuilding, or restarting. Use for runtime questions that
  source inspection and existing logs cannot answer, such as intermittent
  failures, branch decisions, in-scope values, or verifying a running fix.
  Also use for requests to list, inspect, update, enable, disable, reactivate,
  or remove Sniftr logpoints, including outside an investigation.
metadata:
  version: "1.0.0"
---

# Sniftr Runtime Debugging

Use targeted, read-only logpoints when source inspection and existing logs cannot answer a question about a running application. Correlate emitted evidence with source; distinguish observed facts, inference, and remaining unknowns. Only Java/JVM is currently supported.

Use the Sniftr logpoints MCP for instrumentation and an available application logging integration for emitted evidence. Sniftr does not provide a logs MCP. Follow current tool schemas and returned guidance; this skill explains how to compose them into an investigation.

## 1. Establish the question and evidence path

Identify the symptom, expected behavior, intended environment/app, and one observation that distinguishes plausible causes. Reuse established context; ask only for missing information that affects the next decision.

Before adding instrumentation, establish where its logs can be read and how the target flow will occur. Use an available logging integration, existing authorized log access, or user-supplied logs. If no evidence path exists, resolve that gap before creating points solely to collect evidence. This does not block a request specifically to manage logpoints.

Choose an already-authorized agent-executed trigger, user reproduction, or natural traffic. Know the request/job discriminator and observation window when available. Agent execution must stay within the user's authorization; otherwise ask for the necessary action or permission. Do not ask the user to repeat information or perform a trigger the agent is already authorized and able to execute.

## 2. Select the target and operation

Use `list_environments` only when the intended environment ID is not established. It lists connected environments; a known disconnected environment can still be inspected through `list_logpoints` or `get_logpoint`.

For new instrumentation, use `list_apps` with the environment and source class FQCN to select the intended app and collect its reported revisions. A class match is at app level, not proof for every instance or of source equality. A successful empty result means no checked app reported the class; verify the environment and FQCN. An incomplete check returns `runtime_unavailable`; follow its recovery guidance without treating the error as class absence. Do not substitute another app. Ask for selection only when ambiguity remains.

Use `list_logpoints` once for the relevant environment to find reusable probes and avoid duplicates. For a known point, use `get_logpoint` when its definition/status is not already available from a current inspection. Both return the same public definition and effective status. Preserve full IDs for tool calls and short IDs for log searches.

| Intent or current state | Tool and purpose |
| --- | --- |
| Existing active probe answers the question | Reuse it and collect evidence; do not create a duplicate. |
| Observe a new location | `create_logpoint`; an existing point's app/class/method/line cannot be moved. |
| Change expressions at a saved location | `update_logpoint`; disabled points cannot be edited, and pending/removing/disabling transitions must settle. |
| Uncertain line/expression or unclear rejection | `validate_logpoint`; optional dry-run, with no saved point or injection. |
| Resume a disabled definition | `enable_logpoints`; fresh per-ID source verification and a connected target are required. |
| Resume a throttled point | `reactivate_logpoint`; first reduce noise if needed and recheck status after an update. |
| Retain a definition but stop instrumentation | `disable_logpoints`; inspect every per-point outcome. |
| Delete an obsolete definition | `remove_logpoint`; preserve unrelated points. |

Read [enablement](references/enablement.md), [reactivation](references/reactivation.md), [disablement](references/disablement.md), or [removal](references/removal.md) when using those operations. Inspection, reactivation, disablement, and removal do not require source comparison. Create, update, and enable require a connected intended app; a source override never permits offline instrumentation.

If asked to edit a disabled definition while keeping it disabled, explain that this is unsupported and leave it unchanged. If the user intends to resume with different expressions, create a replacement through the normal creation workflow and remove the obsolete disabled point when appropriate. Do not enable the old definition merely to make it editable.

## 3. Prepare the smallest useful probe

Before composing the first message or condition, call `list_expression_rules` and read the Java guide's [line selection](references/logpoint-compatibility-java.md#1-line-selection), [message expressions](references/logpoint-compatibility-java.md#3-message-expressions), and [conditions](references/logpoint-compatibility-java.md#4-conditions). Consult its scope, method, MDC, generic-type and rejection sections when the proposed expression needs them. Reuse the rules; refresh after a known policy change or a rejection indicating stale rules. See [both rule types and matching examples](references/expression-rules.md) when interpreting the policy.

Inspect exact source with line numbers. Prefer one point that distinguishes the hypotheses, using existing scalar values, booleans, statuses, counts, and bounded identifiers. Use additional points only when they add distinct evidence; correlate them with the same request or operation. Use bisection along a call chain when locating where behavior changes.

### Before-line evaluation

Java logpoint conditions and message expressions are evaluated before the instrumented line executes. Choose an executable statement after referenced locals have been assigned and while they remain in scope. Do not choose a declaration line to observe its newly initialized local, or assume the next physical line is executable. Check the exact method/overload and declared types.

Apply the returned expression rules before submitting: method names in both messages and conditions must match an allow rule; sensitive-name deny rules apply only to message expressions and take precedence there, and permission by name does not guarantee supported types or read-only behavior. Current expression rules apply to new and replacement definitions. Enable and recovery preserve recorded expression-policy approval. Older definitions without recorded approval must pass current rules before delivery. Prefer direct values over method calls. Keep calls bounded and read-only; avoid secrets, credentials, tokens, raw personal data, full payloads and unbounded objects.

Messages contain text and `{value-access}` placeholders; comparisons and boolean logic belong in `condition`. Put the facts needed for diagnosis in the message: a false condition emits nothing. Use a selective, inexpensive condition on busy paths and guard nullable receivers before dereferencing. Known MDC keys can provide request correlation when locals do not. Do not duplicate IDs, timestamps or location metadata already supplied by Sniftr/logging.

Read [worked Java examples and rejection repairs](references/logpoint-examples-java.md) for branch decisions, correlated service boundaries, hot paths or uncertain expressions.

### Source verification and evidence reuse

Before create/update, follow [local source verification](references/source-verification.md). Compare the actual working file, including staged/unstaged changes, with every known target revision; matching HEAD hashes alone is insufficient. Identical file contents are authoritative even when commits differ. Submit the full local HEAD hash, not a deployed hash, and echo runtime hashes as reported, including abbreviated prefixes and nulls.

Missing runtime hashes allow optimistic instrumentation using `unknown_revision` without approval; still compare every known revision. Changed or unverifiable known source requires explicit approval for `user_approved_override`. Enablement additionally compares the saved source revision and requires fresh verification for every selected ID; see [retained definitions](references/source-verification.md#enabling-a-retained-definition). Do not reuse old approvals automatically.

One fresh inspection/discovery result can serve both target selection and source verification within the current preparation sequence. Do not repeat `list_apps`, `list_logpoints` or `get_logpoint` merely because a reference repeats that prerequisite. Recheck if the target/policy/source changed, the result is no longer current, or the server returns `verification_stale`. A later mutation needs fresh applicable evidence; this is not permission to cache verification indefinitely.

For updates, identify the point by `envId` and `id`; do not send its immutable app, class, method or line. Inspect that saved location to choose expressions valid in its scope. `update_logpoint` validates the resulting message and condition before dispatch, so a separate `validate_logpoint` call is not a routine prerequisite. Send the complete replacement message and intended condition. An omitted, null, or empty condition clears the saved filter; include it explicitly to retain it.

## 4. Execute and interpret the result

Prefer sync for interactive create/update operations on a few points; use async when waiting for each point is undesirable. When supplied, `timeoutMs` must be an integer from 5000 to 60000 ms (default 10000). A sync timeout bounds the runtime-result wait, not earlier checks or an entire batch. It does not cancel work.

For create/update/enable, sync gives pending installation up to 3000 ms from the first pending acknowledgement to settle, within the request timeout. Once all instances have replied, an expired activation window returns the latest status; a still-pending point remains accepted and may activate later. Inspect that same ID instead of creating a duplicate.

Do not validate every point automatically. Use `validate_logpoint` when source/scope/type analysis leaves a real uncertainty or a rejection needs diagnosis; updates already validate before dispatch. Read `validation.valid`, `reason` and any `warning`. Validation checks a representative instance, not every instance, source equality, installation or emission. A failed validation may mean unavailable runtime or timeout rather than an invalid expression.

Use the mutation's returned snapshot and guidance immediately. When a sync create/update is ready for the intended traffic, proceed to reproduction and logs without an obligatory `get_logpoint`. Fetch again when the result is pending/uncertain, incomplete for the next decision, or no longer current. Server syntax or policy rejection returns synchronously in either mode and creates no saved point or ID. Correct the request before submitting again. Runtime rejection after acceptance retains a saved point; keep its ID for repair or cleanup.

Keep three facts separate: effective logpoint status, operation outcome, and observed emission. `completed` may include rejection; read status/reason. Reactivation returns only `accepted` or `timed_out`, and even a resulting `active` status does not confirm every agent resumed. For batches, inspect both `updated` and `failed`; a successful response can contain individual failures. Never repeat the entire batch blindly.

## 5. Reproduce and collect evidence

Use an active result to begin observation, but do not assume every instance accepted the probe. In mixed deployments, failed/skipped can coexist with active instances; inspect the reason and traffic coverage before replacing a point or interpreting missing logs.

If a point remains pending while its app is connected and there is no reported failure, its class may need traffic to load. Use the authorized trigger or agreed traffic window, then inspect the same point and check logs; do not wait indefinitely for active before triggering that flow. Pending alone does not confirm installation. Record the start/end time and relevant request/job identifier for every observation.

Search application log message text for `guidance.logSearchMarker` or `[LOGPOINT <shortId>]` with the time window. Do not use the full tool ID in that marker or assume a structured `logpoint_id` field exists. Use a distinctive message label/correlation value if the marker is unavailable. Paginate when needed to assess absence and account for ingestion delay.

Before interpreting missing logs, check the target app/version received the traffic, the point's state during the window, throttling, whether the condition matched, and log filters/pagination. If any cannot be established, report missing evidence rather than concluding the code did not execute. Reactivation acceptance alone cannot establish that all targeted instances resumed.

## 6. Recover or refine with a bounded observation budget

After accepted/timed-out work, inspect the same IDs rather than repeating mutations. Unless the task specifies another budget, poll after roughly 2, 5 and 10 seconds, then report the unresolved state if unchanged. This is a caller observation budget, not cancellation or a promised completion deadline. Continue only for a reason grounded in new progress, an agreed longer wait, or changed conditions. Do not poll indefinitely, automatically force, or label a wait expiry as runtime failure.

| Evidence or failure | Next decision |
| --- | --- |
| Source coverage is stale | Refresh app revisions and repeat the required file comparison. |
| Target is disconnected | Stop mutation attempts until it reconnects; do not substitute a target. |
| Location or scope rejected | Re-read numbered source. Change expressions at the same location with update; a new location requires creation and cleanup of the obsolete point. Validate if the correction remains uncertain. |
| Expression, access or policy rejected | Use the reason to select a permitted observation. Do not retry unchanged expressions or equivalent bypass rewrites. |
| Validation could not complete | Resolve the connectivity/timeout cause; do not rewrite a potentially valid expression solely because validation failed. |
| Mutation response lost or ambiguous | Inspect the known ID; if creation returned no ID, list the same environment and match the intended target before considering another create. |
| Partial batch | Inspect each ID. Retry only eligible failed items after resolving their cause. |
| Throttled | Narrow noise if needed; inspect after updating and reactivate only if still throttled. |
| Removal/disablement reports no runtime record | Inspect once, then report unresolved cleanup if unchanged. A later runtime sync may settle it; there is no MCP reconciliation command. If deleting the definition is intended, obtain explicit approval for force removal. Do not automatically force, retry, or enable it. |
| Read failed | Retry the read within the observation budget; failure is not absence or permission to create a replacement. |

Use emitted values to evaluate the hypothesis. If the cause is unclear, state what was learned and choose the next discriminating observation; do not accumulate redundant probes. Remove superseded points as the investigation narrows.

## 7. Clean up and report

Remove temporary points created or intentionally managed in this investigation; preserve unrelated user-owned points. Disable instead when retaining the definition is intended. Remove each point by its full ID. For bulk disablement, use explicit IDs for a reviewed set; use `all` only when the entire eligible environment/app scope is intended.

No source verification is needed for cleanup. Failed, skipped, disabled or removed points can be deleted offline; starting runtime removal otherwise needs a connected app. Removal retries for a removing point inspect/wait for the existing operation without another JVM removal command. Follow the [removal](references/removal.md) and [disablement](references/disablement.md) procedures for exact selection, offline behavior and uncertainty.

Force deletion or offline force disablement needs explicit approval. Neither a completed forced operation nor absence in Sniftr independently proves every runtime instance stopped logging. Timeout preserves unresolved work; report it honestly. Stop removal polling on completed deletion or `not_found` for the point just removed.

Report confirmed observations with request/time/location evidence, distinguish the causal inference and remaining unknowns, and include cleanup outcomes. For example: “Request req-1842 emitted eligible=false at QuoteService:43; source requires eligibility for the discount branch. Why eligibility was false remains unknown. The temporary quote probe was removed.” Do not claim a cause beyond the evidence.

## Effective status guide

| Status | Interpretation and action |
| --- | --- |
| `active` | Can reflect acceptance by one instance while others remain pending. Check traffic coverage and fresh logs; after reactivation, resumption remains unconfirmed. |
| `partial` | Partial acceptance. Check whether accepting instances cover the traffic needed for the investigation. |
| `pending` | Work or class loading may be outstanding. For a connected app without a reported failure, trigger the authorized flow, then inspect within the observation budget. |
| `skipped` / `failed` | A rejecting instance can determine this status even while another is active. Read the reason and check logs/traffic coverage before repair; earlier instrumentation may also remain. |
| `throttled` | Hit-rate protection suppressed logging; reduce noise and use the reactivation procedure. |
| `inactive` | Target disconnected. Resume mutation work only after reconnection. |
| `removing` / `disabling` | Cleanup is outstanding. Inspect within the budget; preserve uncertainty if it does not settle. |
| `disabled` | Definition retained but disabled. Read cleanup caveats; enable only when resumption is intended. |
| `removed` | Reported removed. Finish cleanup/inspection; absence alone does not independently prove every runtime instance is clear. |
