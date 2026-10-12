# Removing temporary logpoints

Remove only points created or intentionally managed in this investigation. Choose
`disable_logpoints` instead when the definition should remain available to enable
later. No source comparison or runtime expression rules are needed for removal.

## Calls and follow-up

These complete MCP calls use illustrative IDs; obtain actual values from
`list_logpoints` or `get_logpoint`.

```json
{"envId":"qa","id":"point-1","mode":"sync","timeoutMs":10000}
```

`mode` defaults to `async`. `sync` waits for the runtime result after dispatch;
`timeoutMs` is an integer from 1 to 60000 (default 10000), not a limit on the
entire request. It is ignored in async mode and for force deletion. Failed,
skipped, disabled, or already-removed points can be deleted without a connected
app. Starting runtime removal requires the intended app to be connected. A retry
of a removing point checks or waits for the existing operation; it does not send
another removal command to the JVM.

| Outcome | Meaning and next action |
| --- | --- |
| `accepted` | A command was dispatched without confirmed completion. Inspect the same ID before retrying. |
| `completed` | Removal from Sniftr completed. When a normal runtime command was needed, a terminal removal report was received. Stop polling. |
| `timed_out` | Waiting expired without cancelling removal or restoring its prior status. The point remains removing unless a later result settles it. Inspect before retrying. |

The response includes the latest effective `logpoint`, or `null` if no saved
point remains. An inspection returning `not_found` after removal is a stopping
condition. Neither absence nor a completed result independently proves that every
runtime instance has removed its instrumentation; this matters for disconnected
instances and force deletion. Do not use a replacement logpoint to test cleanup.

For example, a synchronous call times out while the point is removing. After
inspection, another synchronous call with the same IDs waits on the existing
removal. Confirmation finishes deletion and returns completed; another timeout
keeps it removing. If inspection instead returns not_found, stop: the saved point
is already absent. If the runtime reports no record while the saved point exists,
Sniftr returns precondition_failed and does not claim cleanup. Inspect the same
ID once; if unchanged, stop repeated removal attempts and report unresolved
cleanup. A later runtime sync may settle it, but there is no MCP reconciliation
command. Deleting the saved definition now requires explicit approval for force
removal.

## Force deletion

If the app cannot reconnect and the user explicitly approves deleting the saved
point without confirmed runtime cleanup:

```json
{"envId":"qa","id":"point-1","force":true}
```

Sniftr attempts asynchronous runtime removal when applicable, then deletes the
saved point without waiting. `completed` in this case confirms only removal from
Sniftr. An instance may still emit logpoint messages. Explain that limitation
when reporting cleanup; do not claim that bytecode removal was verified.

## Errors

Read `error.code`, `message`, and `nextAction`. `runtime_unavailable` means the
intended app is disconnected; `dispatch_failed` means removal could not be sent;
`runtime_rejected` includes a reported rejection. `precondition_failed` can mean
the saved point exists but the runtime has no record; cleanup is unconfirmed.
Inspect the point and its statusReason. Force deletion is an option only with
explicit approval to delete the saved definition without confirmed cleanup. Unexpected `internal_error`
may occur after dispatch. Inspect the same ID before retrying uncertain work and
do not treat any of these errors as authorization for force deletion.
