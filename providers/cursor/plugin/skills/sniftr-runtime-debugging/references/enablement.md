# Resume retained logpoints

Use `enable_logpoints` to resume disabled definitions with the same IDs. It does
not change messages, conditions, source revisions or target locations. Use
`create_logpoint` for a new definition, `update_logpoint` for an editable existing
point, and `reactivate_logpoint` for a throttled point.

## Prerequisites and selection

Create, update and enable all require connected targets. There is no offline
queue or `force` input for enablement. Source compatibility overrides authorize
source differences only; they never bypass connectivity or runtime safety checks.
Enable reuses recorded expression-policy approval. Older definitions without it must pass current rules. If a disabled definition fails these checks, create a permitted replacement only if intended.

Inspect the points, refresh the target apps, and follow
[local source verification](source-verification.md#enabling-a-retained-definition).
Supply `envId` and exactly one of nonempty `ids` or `all: true`. Duplicate IDs are
processed once. If any explicit ID is missing, inaccessible, or belongs to another
environment, the entire request returns `isError` with `not_found` before any
point changes. After access validation, wrong-app or non-disabled points return
per-point `precondition_failed` errors. An optional `appId` restricts selection.

`all: true` selects one snapshot of accessible disabled points in the environment/app.
Inspect that scope first and supply a verification entry for each selected ID.
Unselected or duplicate verification entries reject the request before mutation;
a missing entry fails that individual point. An empty selection with
`verifications: []` succeeds without mutation. Prefer explicit IDs when retaining
control of a reviewed target set.

Complete MCP example with illustrative IDs and revisions:

```json
{
  "envId": "qa",
  "ids": ["point-1"],
  "verifications": [{
    "id": "point-1",
    "source": {
      "filePath": "src/Checkout.java",
      "commitHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    },
    "sourceVerification": {
      "result": "identical",
      "runtimeCommitHashes": ["bbbbbbb"]
    }
  }],
  "mode": "sync",
  "timeoutMs": 10000
}
```

`identical` asserts that the actual local file matches the saved source revision
and every known runtime revision; matching commit hashes alone is insufficient.
Unknown runtime hashes allow optimistic instrumentation with `unknown_revision`
and no approval, but do not excuse a changed or unverifiable saved source file.
Use `user_approved_override` only with explicit approval covering the reported
gap. Missing saved source metadata cannot be repaired through enablement or by
editing a disabled point; create a replacement only when intended.

## Outcomes and recovery

Read `updated: [{logpoint, operation}]` and `failed: [{id, error}]` separately.
A successful batch response may contain failures. Errors contain `code`,
`message`, and agent-facing `nextAction`.

- `accepted`: instrumentation remains outstanding; inspect the same ID.
- `completed`: a terminal runtime result is known, including rejection. Read
  status and statusReason; completion does not prove log emission.
- `timed_out`: waiting expired without cancellation. Inspect before retrying;
  late runtime results can still settle the point.

Async is the default. Sync waits separately for each point (10000 ms by default,
integer 5000–60000); this is not a batch deadline. Timeout is ignored in async mode.
Within that limit, sync waits up to 3000 ms from the first pending acknowledgement
for installation to settle. Once all instances have replied, an expired activation
window returns the latest status without canceling installation; a still-pending
point remains accepted and may activate later.
Do not retry the entire batch after partial success. Points that have left the
disabled state cannot be enabled again; inspect the existing operation instead.
