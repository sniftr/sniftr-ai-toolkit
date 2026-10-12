# Disablement outcomes and examples

Use `disable_logpoints` to stop instrumentation while retaining definitions for
later `enable_logpoints` use. Use `remove_logpoint` to delete them. No source
verification is needed to disable. Inspect the selected points first and preserve
unrelated points owned by other investigations.

## Select targets

Supply the saved `envId` and exactly one of nonempty `ids` or `all: true`.
Use full IDs from inspection, not short IDs. Duplicates are processed once.
An optional `appId` restricts the selection; with explicit IDs, a mismatched app
is a per-point error rather than a silently omitted target.

`all: true` captures the target set once. It excludes disabled, removing and
removed points, and includes disabling points. Points appearing later are not
added. Use it only when disabling every eligible point in the selected scope is
intended. Explicit already-disabled IDs complete without mutation; explicit
removing/removed IDs fail. Missing IDs and IDs from another environment both
produce `not_found`.

Complete MCP example (replace illustrative identifiers with inspected values):

```json
{
  "envId": "qa",
  "ids": ["point-1", "point-2"],
  "mode": "sync",
  "timeoutMs": 10000
}
```

For an intentionally selected whole application:

```json
{
  "envId": "qa",
  "appId": "checkout",
  "all": true,
  "mode": "async"
}
```

## Interpret every result

`requestedCount` counts unique selected targets. Each appears in either `updated`
(as `{logpoint, operation}`) or `failed` (as `{id, error}`). Read each result;
HTTP success or an MCP result without `isError` can contain per-point failures.
`error.code`, `message`, and agent-facing `nextAction` explain recovery.

- `accepted`: disablement is outstanding. Inspect the same ID with `get_logpoint`.
- `completed`: the retained definition is disabled. Read `statusReason`; this
  alone does not independently establish cleanup in every runtime instance.
- `timed_out`: waiting expired without cancelling disablement. The point remains
  disabling unless a later result settles it. Inspect before retrying.

The default mode is async. Sync waits separately for each point (default 10000 ms,
range 5000–60000); processing is sequential, so total request time may exceed that
limit. Async ignores `timeoutMs`. An already-disabling async request returns the
outstanding state; sync can wait for the existing operation. Do not repeat a whole
batch automatically after partial results, or automatically enable a point to
repair uncertainty. If the runtime reports no record, inspect once and report
unresolved cleanup if unchanged. A later runtime sync may settle it; there is no
MCP reconciliation command. Keep the definition when retention is required.
Deleting it instead requires explicit approval for force removal, which does
not confirm runtime cleanup. Forced disablement while connected still uses the
same runtime processing and is not a workaround for a missing runtime record.

## Disconnected targets

Starting runtime disablement requires the intended app to be connected. Failed
or skipped points can be disabled offline. Otherwise, reconnect or obtain
explicit user approval before supplying `force: true`.

Forced offline disablement retains the definition as disabled and returns a
`statusReason` warning that runtime cleanup is unconfirmed: an instance may
still emit logs. With a connected target, force still uses ordinary runtime
processing and wait options. Do not automatically force after a timeout,
connection failure, or partial batch failure.
