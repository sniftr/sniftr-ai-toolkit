# Expression rules

Call `list_expression_rules` with `{}` before composing the first logpoint message or condition. It reads the effective policy without selecting an environment or requiring a connected app. Reuse the result; refresh after a known policy change or a rejection suggesting stale rules. A lookup failure does not mean no restrictions apply.

Current rules apply to create, update, and validation of proposed definitions. Later policy changes do not reapprove definitions with recorded approval. Older definitions without recorded approval must pass current rules before enable or recovery; saved status alone does not prove approval. Runtime type, access, and safety checks still apply.

The response combines active built-in (`base`) and organization-configured (`custom`) rules:

- **Method-name allow rules** (`target: method`, `effect: allow`) apply to both messages and conditions and permit matching method names in calls. Calls whose method name matches no allow rule are rejected. Matching is case-sensitive. This permission alone does not establish support for the receiver type, signature, or operation.
- **Sensitive-name deny rules** (`target: name`, `effect: deny`) apply only to message expressions and block matching identifiers, including variable, field, method, class and package names, receiver variables and variables passed as arguments. Matching is case-insensitive. In messages, a deny rule wins even when a method-name allow rule matches. Literal string contents are excluded. Older Java v1.1 agents can also reject sensitive names in conditions.

Patterns match the whole name, with `*` matching zero or more characters. These are name checks, not a guarantee that a value contains no sensitive data. Keep observations focused and avoid emitting secrets.

## Java examples

These are illustrative expression fragments, not complete creation payloads. Consult [Java expressions](logpoint-examples-java.md) and the live returned policy before choosing expressions.

| Illustrative rules | Expression fragment | Interpretation |
| --- | --- | --- |
| Allow method `get*` | `order.getTotal()` | Passes the method-name check; receiver support, scope and other checks still apply. |
| Only allow method `get*` | `items.stream()` | Rejected: no allow rule matches `stream`. |
| Allow method `get*`; deny name `*token*` | `request.getToken()` | Denied by the sensitive-name rule despite the allow match. |
| Deny name `*token*` | `accessToken` or `ACCESS_TOKEN` | Both are denied, regardless of letter case. |

For an order-total investigation, prefer a permitted in-scope total value over inspecting credentials. On policy rejection, inspect the reason and refresh rules if needed. Do not rewrite equivalent expressions to bypass a deny rule. If no permitted observation answers the question, use other evidence. Passing policy checks does not establish runtime acceptance or log emission.
