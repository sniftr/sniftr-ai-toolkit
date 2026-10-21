# Java Logpoint Examples

## Contents

1. Wrong branch in a request handler
2. Intermittent null across a service boundary
3. Hot loop with a narrow condition
4. MDC-scoped condition
5. Skipped logpoint repairs

All identifiers and payloads are illustrative; derive real values from source and MCP discovery.

## 1. Wrong branch in a request handler

Source:

```java
public Quote quote(String requestId, User user, Cart cart) {
    boolean eligible = eligibility.isEligible(user);
    if (eligible && !cart.isEmpty()) {
        return discount.apply(cart);
    }
    return standard.quote(cart);
}
```

Question: Why did request `req-1842` receive the standard quote?

Create or resume the investigation case first; replace the illustrative case ID below with its returned canonical ID. Create one point on the `if` line after `eligible` is assigned:

```json
{
  "caseId": "7k3m9q2v8x4n6r5t",
  "envId": "qa",
  "appId": "checkout-service",
  "className": "com.acme.checkout.QuoteService",
  "methodName": "quote",
  "lineNumber": 43,
  "message": "decision requestId={requestId} eligible={eligible} cartEmpty={cart.isEmpty()}",
  "condition": "requestId == \"req-1842\"",
  "source": {
    "repositoryName": "acme/checkout",
    "filePath": "src/main/java/com/acme/checkout/QuoteService.java",
    "commitHash": "0123456789abcdef0123456789abcdef01234567"
  },
  "mode": "sync",
  "sourceVerification": {
    "result": "identical",
    "runtimeCommitHashes": ["0123456"]
  }
}
```

This example assumes local file comparison succeeded for every reported revision;
use the actual reported hashes and the [verification procedure](source-verification.md).
If discovery reports no runtime hash, use `unknown_revision` with `[null]`
instead, without requesting approval. For mixed revisions, compare every known
revision and include both the reported hashes and nulls.
Create with `mode="sync"`, reproduce after the point is active, then retrieve emitted logs through your available logs integration by searching log message text for the `[LOGPOINT <short-id>]` marker within the reproduction time window. Use the short ID in the message, not a structured `logpoint_id` or `logpointId` field. This single point distinguishes both decision inputs without logging the cart or user.

If the line or an expression is uncertain, the JSON payload above can first be
passed to `validate_logpoint` after removing `sourceVerification` and any `mode`/`timeoutMs` options. Replace the
illustrative hash with the full local HEAD hash and other identifiers with values
from source and discovery. Review `valid`, `reason`, and any `warning`. For
example, a scope rejection for `eligible` means inspecting whether the effective
line precedes its assignment, then selecting the following executable line and
validating again. A timeout calls for checking runtime availability, not rewriting
the expression. Validation does not compare the source file with deployed Git
revisions or prove that all instances will accept the point.

## 2. Intermittent null across a service boundary

Question: for one request, did the directory return null, and did that same
request reach the mapper with a null profile? Use two probes only when existing
logs or the exception do not already answer this.

Illustrative source locations (use actual numbered source in the target checkout):

```java
// ProfileService.load(String requestId, String accountId)
Profile profile = directory.find(accountId);       // line 74
return mapper.toResponse(requestId, profile);       // line 75: probe A

// ProfileMapper.toResponse(String requestId, Profile profile)
if (profile == null) {                              // line 21: probe B
    return Response.missing();
}
```

Expression fragments for the two locations:

```text
Logpoint A at ProfileService.load:75
message:   after-find-null requestId={requestId}
condition: requestId == "req-1842" && profile == null

Logpoint B at ProfileMapper.toResponse:21
message:   mapper-received-null requestId={requestId}
condition: requestId == "req-1842" && profile == null
```

Both use the same request identifier and reproduction window. The example
assumes requestId is an existing parameter at both locations; do not change the
application to add it. If unavailable, use a [preconfigured MDC key](logpoint-compatibility-java.md#mdc) or
another existing correlation value that is valid in both scopes.

Messages from both points for that request show null at both boundaries. A alone
does not prove the mapper was not called: first check B's state, traffic coverage,
condition and log ingestion. Neither probe explains why the directory returned
null. Do not write `{profile == null}` in a placeholder; the fixed message tag
records the fact established by the condition without rendering the profile.

## 3. Hot loop with a narrow condition

Source:

```java
for (Order order : orders) {
    if (order.isExpired(now)) {
        expire(order);
    }
}
```

Bad:

```text
message: order={order}
condition: order != null
```

Good when investigating one order:

```text
message:   matched orderId={order.getId()} expired={order.isExpired(now)}
condition: order != null && order.getId() == "ord-77"
```

If `isExpired(now)` is rejected as not read-only or the argument type is unsuitable, place the point on the first line inside the `if` body and use a fixed `expired=true` tag. Control flow then supplies the fact without evaluating the method again.

## 4. MDC-scoped condition

The source line has no `requestId` local or field. The application populates it
in the request thread's SLF4J MDC, and the Java agent starts with
`-Dsniftr.mdc.keys=requestId` (see [MDC prerequisites](logpoint-compatibility-java.md#mdc)):

```java
return authorization.authorize(user, action);
```

Use an MDC key as the condition discriminator so the point emits only for the
target request:

```text
message:   decision userId={user.getId()} action={action}
condition: requestId == "req-1842"
```

If `requestId` has no value on the executing thread, it evaluates as `null`,
so this condition emits nothing.

## 5. Skipped logpoint repairs

### Unqualified static class

Skipped:

```text
condition: CollectionUtils.isEmpty(items)
```

Repair:

```text
condition: org.springframework.util.CollectionUtils.isEmpty(items)
```

Prefer `items == null || items.isEmpty()` if those operations are supported on the declared type; this avoids static resolution.

### Local not yet in scope

Source:

```java
Result result = gateway.call(request);
if (result.isRetryable()) { ... }
```

Skipped point on the assignment line:

```text
message: result={result}
```

Repair: move to the following `if` line, where `result` is definitely assigned.

### Accessing subtype members through `Object`

If `payload` is declared as `Object`, you can log `payload={payload}` without a cast, subject to the usual rendering and data-sensitivity considerations. To access `getUser()`, you need a type that declares that method: Sniftr resolves members from the declared type, not the concrete object’s runtime class.

Rejected when `payload` is declared as `Object`:

```text
condition: payload.getUser().isActive()
```

If the application path guarantees that `payload` is a `com.acme.UserPayload`, use an explicit fully qualified cast:

```text
condition: ((com.acme.UserPayload) payload).getUser().isActive()
```

No cast is needed if `payload` is already declared as `UserPayload`. Being an object does not itself require casting; accessing members absent from its declared type does. The cast does not establish that `payload` or `getUser()` is non-null.

Alternatively, use an existing `UserPayload`-typed local after application code initializes it. Casting `payload` elsewhere does not change its declared type.

### Nested method argument

Skipped:

```text
message: cached={cache.get(user.getId())}
```

Repair: pass an already-computed, in-scope `userId` instead of the nested method call:

```text
message: cached={cache.get(userId)}
```

### Unsafe getter

Skipped:

```text
message: details={entity.getDetailsForLog()}
```

Repair: use safe scalars already available:

```text
message: entityId={entity.getId()} status={entity.status}
```

Do not weaken safety rules during a customer investigation.
