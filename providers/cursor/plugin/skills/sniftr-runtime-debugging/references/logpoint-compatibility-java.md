# Java / JVM Logpoint Compatibility

Use this reference for Java expressions evaluated by the Sniftr JVM agent. It is not a Node.js, Python, Kotlin or general expression-language contract. Java syntax alone does not establish Sniftr support: expressions must pass the tool/server parser, the agent's structured-input restrictions, binding, access checks and read-only validation.

Prefer an existing scalar/local/field at a suitable line. On rejection, use the specific reason to simplify, inspect inputs separately, or select a location where the result is already available. Do not weaken types merely to force acceptance.

Read [Java logpoint examples](logpoint-examples-java.md) when you need a worked pattern for a wrong branch, intermittent null across a service boundary, hot loop, MDC-scoped filter, or skipped-logpoint repair.

## Contents

1. Line selection
2. Scope and type rules
3. Message expressions
4. Conditions
5. Read-only method policy
6. Static members, casts, MDC, lambdas, and inner classes
7. Generic types and method results
8. Common rejection reasons

## 1. Line selection

Apply the shared [before-line evaluation rule](../SKILL.md#before-line-evaluation). Select an executable statement inside the exact method, after every referenced local has been initialized and while it remains in scope.

```java
Order order = loadOrder(orderId); // Line 40: order is not yet available to a logpoint here.
process(order);                  // Line 41: order is available; process has not run yet.
```

To log `order={order}` or test `order != null`, target line 41, not line 40. Use the next suitable executable line after initialization, not merely the next physical line (which may be blank or a comment). If there is no later executable location within scope, select another observation point.

| Target | Runtime support | Operational advice |
| --- | --- | --- |
| Executable statement | Supported | Prefer this. |
| Method signature/body prelude | Often maps to first bytecode line | Use only parameters/fields; prefer first body statement. |
| Local declaration with initializer | Supported at its bytecode location | The new local is not yet available; target a following executable line after initialization. |
| Declaration without initializer | Can map to next instruction | To read the local, target an executable line after its later initialization. |
| Blank/comment gap | Can map to next instruction | Timing/scope may surprise; avoid. |
| Multiline statement argument line | Can map to the statement’s bytecode | Prefer the statement’s primary executable line. |
| Closing brace/trailing source line | Can map to trailing method bytecode | Avoid unless deliberately observing exit and scope is verified. |
| Lambda body line | Supported in lambda method | Fires per lambda invocation; use lambda/captured scope. |
| Annotation/import/package/outside method | Unsupported or ambiguous | Never target. |
| Nonexistent line or wrong method range | Skipped | Re-read numbered source and overload boundaries. |

Sniftr may resolve a source-only line to a nearby effective bytecode line. Expression scope is checked at that effective line, not merely by visual source placement. Direct executable lines minimize this ambiguity.

## 2. Scope and type rules

Supported roots include:

- method parameters and locals in scope at the effective line;
- instance/static fields reachable from `this`;
- `this` and qualified outer access;
- plain SLF4J MDC key names when MDC is visible;
- FQCN static classes/members.

Use the declared/static type, not the runtime type, to decide which members an expression can access. Concrete generic metadata is preserved where supported; `Object`, raw collections, restricted type-variable receivers or base classes can still hide members. Add an explicit cast only when the runtime value is reliably that type:

```java
((com.example.UserPayload) payload).getUser().isActive()
```

Never reference a local on its declaration/initialization line or earlier, after its lexical scope ends, or from a sibling lambda/branch scope.

## 3. Message expressions

Sniftr-emitted application logs are prefixed by the agent as:

```text
[LOGPOINT <short-logpoint-id>] <message> (injected at line <line>)
```

Do not duplicate metadata that Sniftr or the log provider already supplies, such
as the logpoint ID, timestamp, logger/class, app, environment, source file, or
line. Keep configured messages focused on the investigation-specific label and
runtime facts:

```text
<label> requestId={requestId} state={state}
```

Message syntax is text containing `{expression}` placeholders:

```text
decision orderId={orderId} status={order.getStatus()} itemCount={items.size()}
```

The following are syntactically supported shapes using method names permitted by the shipped base rules. Organization deny rules, receiver/signature support and read-only validation still apply; illustrative custom getters must exist and pass those checks:

```java
user
user.name
user.getName()
user.getAddress().getCity()
items.size()
items.get(0)
array[0]
array.length
matrix[0][1]
map.get("key")
formatter.getFormatted(age, country)
((com.example.Payload) payload).getId()
com.example.Flags.isEnabled()
com.example.State.READY
```

Message rendering may use reflection after the condition/throttle gates, but expressions still undergo parsing, existence, access, and read-only validation before injection.

Message placeholders support value access, not arbitrary expression evaluation. Do not put boolean logic, comparisons, arithmetic, assignments, ternaries, or condition syntax inside `{...}`:

```text
// Unsupported
{user != null}
{count + 1}
{enabled ? "yes" : "no"}
```

Method arguments may be supported literals or simple names resolving to variables/parameters/direct fields. Do not use computed or nested calls as arguments:

```java
// Supported
cache.get(userId)
map.get("tenant")
formatter.getFormatted(age, "US", true)

// Unsupported
cache.get(user.getId())
cache.get(user.address.id)
cache.get(computeKey())
formatter.getFormatted(user.getAge(), country)
items.get(index + 1)
```

Additional invocation limits:

- `null` is unsupported as a method argument; `value != null` remains a supported condition.
- Expanded varargs such as `helper.getValues(a, b)` for a sole array parameter are unsupported. Pass an existing compatible array instead.
- Message method arguments do not support primitive widening: an `int` argument does not match a sole `long` parameter through this path. Use an existing correctly typed value or a correctly typed literal such as `1L` when that preserves the intended call. Conditions support primitive widening, but reject wrapper-to-primitive argument unboxing.
- Casts and nested expressions are not method arguments in the current structured contract. Do not repair overload ambiguity with `helper.getValue((Type) value)`.
- Array/list index syntax takes a constant integer. A list-index result may be typed as `Object`; do not assume subsequent member access retains its element type. Check validation or use an existing typed element.

Do not place condition syntax in a placeholder. Put boolean filtering in `condition`:

```text
message:   user={user.getId()}
condition: user != null && user.isActive()
```

Prefer simple in-scope values: stable identifiers, booleans, enum/status names,
counts, sizes, and categories. Use complex objects only when they are bounded,
safe to render, and materially more informative than scalar fields. Avoid full
payloads, object graphs, secrets, credentials, tokens, session material, private
keys, raw personal/PII data, and other sensitive data. Use method invocation
only as a last resort when the needed signal is not already available, and keep
the call bounded, read-only, and compatible with Sniftr's expression rules.

## 4. Conditions

Conditions are bare Java-like boolean expressions. They compile to direct bytecode and never fall back to reflection.

Use conditions to control when the logpoint emits. Their main purpose is to
filter noise, target the relevant request/data shape/state, and prevent
excessive logging that can trigger rate limits and throttle the logpoint. On hot
paths, add a selective condition whenever a reliable discriminator is available,
such as a request ID, tenant/account ID, feature flag, endpoint/action name,
status/category, bounded state check, or SLF4J MDC key.

Do not rely on a condition as the primary diagnostic signal. A false condition
emits nothing. Include the runtime evidence you need in the emitted message.

Conditions run before message rendering and throttling-sensitive work. Keep them
simpler than message placeholders. Use null guards before dereferencing with
`&&` short-circuiting.

Supported forms:

```java
user != null
count > 0
price <= 100.0
status == "READY"
ready
!items.isEmpty()
user != null && user.isActive()
status == "READY" || status == "ACTIVE"
items[0] != null && flags[1]
com.example.Flags.isEnabled()
status == com.example.Status.READY
((com.example.Payload) payload).getUser().isActive()
```

Supported condition expression roots and values:

- parameters, locals, fields, and `this` in scope at the effective line;
- plain SLF4J MDC key names when MDC is visible;
- FQCN static fields/methods and enum constants;
- literals: string, boolean, null, integer, long, float, double, and negative numeric literals.

Supported condition operators and grouping:

- `&&`, `||`, `!` with short-circuiting;
- `==`, `!=`, `>`, `>=`, `<`, `<=`;
- parentheses.

### Comparison semantics

Sniftr conditions use Java-like syntax with these comparison rules:

- String and other non-numeric `==`/`!=` comparisons use null-safe
  `Objects.equals` semantics, not Java reference identity. For example,
  `requestId == "req-1842"` compares string contents and is safe when requestId
  is null. Object equality still depends on the type's `equals` implementation.
- Numeric operands are compared as `double`. Large integer values beyond
  `2^53` can round to the same value, so numeric equality is not a reliable
  exact filter for large `long` identifiers. Prefer an existing string
  discriminator or precomputed boolean. Include the actual identifier in the
  message and verify it in the collected logs before attributing evidence to
  a request.
- Non-numeric ordering (`<`, `<=`, `>`, `>=`) uses `Comparable.compareTo`;
  guard nullable receivers and use compatible operand types.

Calling `.equals(...)` on a null receiver still fails. Condition evaluation
errors emit no log for that hit; missing output is not proof that the code path
did not execute. Prefer the null-safe equality form or guard the receiver.

Unsupported condition forms:

- arithmetic: `+`, `-` (except negative literals), `*`, `/`, `%`;
- bitwise/shift: `&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`;
- assignment/increment: `=`, `+=`, `-=`, `++`, `--`;
- ternary `?:` and JavaScript `===`;
- nested/computed method arguments;
- message-placeholder syntax such as `{user != null}`;
- a non-boolean standalone value such as `user` or `count`;
- inaccessible members or members absent from the static type;
- a reference-typed method argument where direct bytecode needs primitive unboxing; use a precomputed primitive local.

Prefer cheap guards first:

```java
requestId != null && user != null && user.isActive()
```

Use side-effect-free conditions and make them selective enough for the path’s traffic.

## 5. Read-only method policy

The backend checks syntax and name rules. Sensitive-name rules apply only to message expressions; method allow rules apply to both messages and conditions. Literal string contents are excluded. The server checks current rules for new/replacement definitions and for saved definitions without matching recorded approval. Enabling or recovering an approved definition does not reapply later expression-name rules. It does not send policy rules to the agent. Java v1.1 uses its built-in rules and can retain stricter sensitive-name checks in conditions. Java v1.2 relies on backend name checks and parses the original expressions locally. Both versions check types, access, and hard-coded bytecode purity rules.

All explicit message/condition methods must return a value and pass the read-only policy.

Usually suitable:

- `get*`, `is*`, `has*`, `can*`, `should*`, `will*`, `describe*` when bytecode is pure;
- trusted JDK reads such as `size`, `length`, `isEmpty`, `get`, `contains`, `containsKey`, `indexOf`, `equals`, `hashCode`, and `toString`;
- pure chained accessors.

Rejected:

- `void` methods;
- setters, updates, deletes, execution/refresh/load methods, increments, and other mutations;
- methods that write fields/arrays/collections, synchronize, do I/O/network/process/runtime/reflection work, or call unsafe owners;
- custom methods whose bytecode cannot be proven read-only;
- untrusted abstract interface/class methods with no inspectable implementation;
- default interface methods whose body or delegated calls fail read-only validation.

A public instance default interface method can be scanned like a concrete class method. A pure default getter, including an inherited default, is supported by agents with this capability. Default-to-default delegation is checked recursively; delegation to an untrusted abstract method is rejected. Static/private interface methods are not enabled by this default-method support. Trusted JDK methods remain separate exceptions.

Method names alone do not establish trust: owner, signature and configured expression rules matter. Current purity scanning checks the selected overload's descriptor. It uses declared implementations; it does not re-check every actual runtime override, so acceptance is not a proof that arbitrary overriding code is side-effect-free.

If a natural getter is rejected as “not read-only,” do not repeatedly retry equivalent chains. Log an already-computed scalar/local or a directly accessible field, or add an earlier logpoint where the value is materialized.

## 6. Static members, casts, MDC, lambdas, and inner classes

### Static members and enum constants

Always use the FQCN for static fields, static methods, and enum constants because source imports are unavailable to runtime resolution:

```java
com.example.FeatureFlags.ENABLED
com.example.FeatureFlags.isEnabled()
com.example.State.READY
```

Do not use imported/simple names such as `FeatureFlags.isEnabled()` or `State.READY`.

### Casts

Use canonical FQCN casts around the receiver:

```java
((com.example.Payload) payload).getUser().getId()
```

Only supported receiver/access-chain casts are available; arbitrary casts inside method arguments and primitive casts are unsupported. A cast can fail at runtime if the value is not that type, so pair it with a reliable discriminator when possible.

### MDC

Sniftr supports plain MDC key references when `org.slf4j.MDC` is visible to the target classloader. Use known application MDC keys proactively for request/trace/tenant/account filtering, especially in conditions on hot paths:

```text
message:   trace={traceId}
condition: traceId != null
```

Reference MDC keys as plain names such as `requestId` or `traceId`; do not call `org.slf4j.MDC.get(...)` yourself. Compound expressions such as `UnknownType.member` are not MDC keys and are rejected.

Explicit target capability configuration overrides automatic MDC visibility detection. With MDC disabled, unknown names are rejected. With MDC enabled, an otherwise unresolved simple name may optimistically bind as an MDC key: acceptance does not prove the key exists or that the name is a valid local. Use keys known from application configuration/code. A missing key may render `NOT_FOUND`; inspect spelling, scope and MDC context rather than treating that text as the application value.

### Lambdas and inner classes

- Lambda body points execute for each lambda invocation.
- Captured values can be available; unrelated parent locals may not be.
- Use `OuterClass.this.field` for outer-instance state in a non-static inner class.
- Use the source class that contains the logical code path; Sniftr may resolve nested compiled classes by line metadata.

## 7. Generic types and method results

Choose members using declared types and available class-file metadata. These examples describe result typing, not blanket permission to invoke the method: syntax, method-name rules, access and purity checks still apply.

| Supported pattern | Example result |
| --- | --- |
| Concrete receiver or argument substitution | `box.getValue()` on `Box<Customer>`, or `<T> T getValue(Box<T>)` with that argument, produces `Customer` |
| Identity binding from an argument | `<T> T getIdentity(T)` with a `Customer` produces `Customer` |
| One certified non-generic common supertype | `<T> T getChoice(T, T)` with two classes whose sole minimal common supertype is `Label` produces `Label` |
| Unconstrained independent concrete bound | `<T> T getValue()` produces `Object`; `<T extends Number> T getValue()` produces `Number`; `<T> List<T> getValues()` produces `List<Object>` |

The common-supertype extension is narrow: one method type variable, direct `T` parameters, non-array/non-generic input types, and a single independent non-generic bound. Do not generalize it to array merging or generic argument merging. Unconstrained defaults require independent concrete bounds throughout the invocation; they do not provide assignment-target or nested-call target inference.

Results requiring unsupported intersection inference, newly inferred wildcard/capture results, or generic argument merging are rejected. Unconstrained recursive/dependent bounds, raw generic bounds and upper-only argument constraints also lie outside these defaults. A wildcard in an existing local declaration is not itself forbidden: `List<?>`, bounded wildcard arguments, arrays and parameterized inner owners can be preserved.

For a declared local type variable:

```java
// <T extends Base>       : item.getName() can bind to Base.getName()
// <T extends Base & Tag> : {item} can be logged; passing item as an argument
//                         uses its bounds, but item.getName() is rejected
```

For a supported inferred interface result, a pure default method can be called:

```java
helper.getChoice(first, second).getLabel()
```

This requires `Label` to be the certified result and `getLabel()` to be a supported, purity-checked default (or otherwise trusted method). Arbitrary abstract interface accessors are not enabled. There is a separate known lookup gap for `Object` methods through interface receivers: for example, `.equals("x")` on the inferred `Label` can report `Method not found` even though Java permits it. Do not interpret that as proof the expression is invalid Java.

On unsupported inference, log `first` and `second` separately or inspect an existing concretely typed result at another line. Creating a new local or helper requires an application change and is not a live-logpoint workaround. Do not retry with erased types or casts that change overload selection.

## 8. Common rejection reasons

| Reason fragment | Likely cause | Correction |
| --- | --- | --- |
| `not an effective bytecode location` | Wrong/nonexistent/out-of-range line | Move to a body statement in the exact method. |
| `Unknown variable` | Typo or value out of scope | Move to an executable line after initialization or use an available root; with MDC enabled, some misspellings instead pass as unknown keys. |
| `local variable ... not in scope` | Correct name, wrong effective line | Move inside its lexical/live range. |
| `Unknown variable or type reference` / `Unresolved condition root` | Root unavailable or unqualified class name | Check scope; use the class FQCN for static access. |
| `Static field/method not found` | Wrong FQCN/member/signature | Verify deployed class and exact member. |
| `requires casting ... static type java.lang.Object` | Erased/broad receiver in condition | Add a safe explicit FQCN cast or simplify. |
| `field/method is not directly accessible` | Condition cannot directly access it | Use a public accessor/local scalar or message-only logpoint. |
| `Method signature mismatch` / `Method not found` | No supported matching member on the declared type; may also be a known lookup limitation | Check owner, signature, argument forms and message/condition restrictions; do not assume the method is absent from Java. |
| `Ambiguous method call` | No unique most-specific supported candidate | Use an existing value with a suitable declared type or another expression; argument casts are unsupported. |
| `requires generic inference beyond supported argument bindings` | Invocation result is outside bounded inference support | Log inputs separately or an existing typed result. |
| `type parameter` with `multiple bounds` | Member access through an intersection receiver | Log the variable itself or use an existing concretely typed receiver. |
| `Cannot resolve the generic type of local` | Known local signature cannot be represented/resolved | Use another existing value/location; do not erase the signature. |
| `Method requires a concrete class implementation` | Untrusted abstract dispatch or another ineligible implementation | Prefer an existing scalar/field or a supported concrete/default getter. |
| `Unknown method argument` | Argument is unavailable or computed | Use a direct in-scope variable/literal. |
| `returns void` / `not read-only` | Unsafe or unverifiable call | Replace with a safe field/getter/precomputed value. |
| `Unsupported operator` | Grammar outside supported subset | Rewrite with comparisons/logical operators. |
| `class bytecode is unavailable` | Runtime cannot inspect target | Verify app/version/classloader; retry only after state changes. |

Read the full status reason, not only the category. `skipped` can describe location, metadata or expression restrictions. `failed` can include user-fixable ambiguity as well as internal errors. `pending` is not evidence that binding has completed; class loading or asynchronous work may still be outstanding. `active` is the reported effective status, not proof that the condition matched or evaluation emitted a log. After reactivation, active reporting does not confirm that every agent resumed; follow the [reactivation procedure](reactivation.md). Follow the status workflow and inspect actual logs to confirm the outcome.
