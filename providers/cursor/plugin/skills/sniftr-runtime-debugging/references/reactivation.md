# Reactivating a throttled logpoint

Use `reactivate_logpoint` when inspection reports `throttled` and the intended app is connected. Use `enable_logpoints` for disabled points. Reactivation resumes existing injections without changing the saved definition, so it requires no source verification input.

Before resuming, consider why the point throttled. Narrow a noisy condition with `update_logpoint` if appropriate, following the normal update verification workflow and the matching runtime expression reference. Inspect again after updating: reactivate only if it remains throttled. Do not repeatedly reactivate a noisy point automatically.

Example: a Java checkout probe hit its rate limit during broad traffic. After narrowing the request condition and inspecting the point, it is still throttled. Using the actual environment and full ID returned by inspection, request:

```json
{"envId":"qa","id":"0aa5a7f3-52fe-4794-971c-d1b51f93145c","mode":"sync","timeoutMs":10000}
```

The identifiers above are illustrative. The result contains `logpoint` and `operation.outcome`. `accepted` means dispatched, including a successful synchronous command response. Current reactivation reporting does not establish that every agent resumed; even `active` is not sufficient proof. Reproduce the targeted request and retrieve fresh logs using the existing logs integration, marker, and time window.

`timed_out` means the command-response wait expired without cancelling the operation. Inspect the same environment/ID and available log evidence before deciding whether another request is warranted. Do not blindly retry or poll indefinitely expecting an operation-completed outcome: reactivation currently reports only accepted or timed_out. For errors, follow `error.nextAction`; reconnect the intended app for runtime_unavailable and recheck status for precondition_failed or runtime_rejected.
