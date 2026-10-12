# Local source verification

Use this procedure before `create_logpoint`, `update_logpoint`, or `enable_logpoints`. It establishes whether the actual
local file being inspected matches known connected revisions of the target app. Missing runtime hashes allow optimistic instrumentation without approval.
Validation does not accept this report or replace this comparison.

## Select the file and revisions

These are prerequisites, not instructions to repeat discovery already completed
in the current preparation sequence. Reuse the fresh target/definition and
revision results from that sequence while they remain applicable. Repeat checks
when the source/target changes, evidence is no longer current, or verification is
stale. A later mutation requires fresh applicable evidence; do not carry forward
old approval or verification automatically.

1. For creation, select the environment/app and inspect `list_logpoints` to avoid
   duplicates. For an update, use a current list snapshot or `get_logpoint` to
   read the point. Keep its environment, app, class, method,
   and line. A disabled point cannot be edited; pending, removing, and disabling
   transitions must settle. Do not enable a point merely to edit it without the
   user's intent to resume instrumentation.
2. Inspect that location in the actual local file. Determine its repository root
   and repository-relative path. Use fresh `list_apps` discovery from this
   preparation with the selected `envId` and class FQCN, select the intended
   `appId`, and collect every `versions[].commitHash`.
   Preserve reported hashes for the request, including `null` for unknown hashes.
   If the intended app is disconnected, stop until it reconnects.
3. Read full local HEAD in the repository containing the file. Submit this value
   as `source.commitHash`, including when local commits have not been pushed.

```sh
git rev-parse --verify HEAD
```

## Compare each deployed revision

Run commands from the repository root. The angle-bracket values below are
placeholders, not literal arguments. Quote substituted values safely; do not
evaluate source paths or runtime values as shell code.

Accept a reported revision for an `identical` result only if it is hexadecimal,
at least seven characters long, and resolves unambiguously to a local commit.
An abbreviated runtime hash matches by prefix; it need not equal the full local
HEAD string. Skip missing hashes (`null`); resolve each reported revision separately:

```sh
git rev-parse --verify --quiet '<runtime-hash>^{commit}'
```

If a valid reported revision is missing locally, fetch the relevant configured
remote when authorized, then retry resolution. A fetch does not change the
working file. If the revision still cannot be resolved unambiguously, treat it
as unverifiable; do not guess a commit or replace a known hash with null.

Confirm that the actual local file exists and that the same path exists as a
file in the resolved commit. Do not interpret a comparison of missing paths as
proof of equality.

```sh
git cat-file -e '<resolved-commit>:<filePath>'
git cat-file -t '<resolved-commit>:<filePath>'
git rev-parse --verify '<resolved-commit>:<filePath>'
git hash-object --no-filters -- '<filePath>'
```

The object type must be `blob`. Compare the deployed blob ID from `rev-parse`
with the local file's blob ID from `hash-object`. Both commands must succeed:
equal IDs establish identical contents; different IDs mean changed; command
failures mean unverifiable. `hash-object` without `-w` does not write an object.
Using `--no-filters` compares actual file contents without clean filters. This
also checks files marked assume-unchanged or skip-worktree, which a normal Git
diff can overlook. Line-ending differences count as changed.

Comparing with the working file includes staged and unstaged changes; a
commit-to-commit comparison is not sufficient. Perform this check even when
deployed and local HEAD hashes match. Only the target file needs to match;
unrelated changes do not invalidate it.

## Report the result

- If every comparison confirms equality, use `sourceVerification.result =
  "identical"`. Different commit hashes are acceptable when the target file is
  identical. Local file verification is authoritative for MCP creation, updates, and enablement.
- If one or more revisions have no reported hash, use `unknown_revision` with
  `null` for each missing hash. No user approval is needed. All known revisions
  must still pass local file comparison. Inspect the resulting runtime status
  and reason; acceptance does not establish source equality for unknown revisions.
- If the target file differs or is missing, or a reported revision is malformed,
  ambiguous, or unavailable locally, explain the gap and obtain explicit user approval before
  using `user_approved_override`. Record the approval reason in `overrideReason`.
  Without approval, stop the mutation. An override does not bypass expression
  policy, connectivity, or runtime validation.
- For every result, echo the reported runtime hashes in `runtimeCommitHashes`;
  do not replace abbreviated hashes with their expanded local values. Unknown
  hashes are `null`; they do not require approval. Never replace a reported hash
  with null to skip comparison.
- Submit `source.filePath` and the full local HEAD hash. Repository
  identifiers are optional; on updates, omission preserves saved values.

For example, a deployed prefix can resolve to an older commit while the local
checkout contains unrelated, unpushed commits. If the target file matches, use
`identical`. Conversely, matching HEAD hashes with edits to the target file do
not establish equality; inspect the diff and obtain approval before an override.

Sniftr checks that the reported revisions cover the connected target revisions;
the caller performs the file comparison. If it returns `verification_stale`,
refresh discovery and repeat verification for the current revisions. For an
accepted or timed-out update, inspect the same logpoint before considering a
retry; a new verification report alone does not establish that retrying is safe.

Creation returns the saved point and effective status, with no separate operation
outcome. If pending or the response is uncertain, inspect the returned ID, or
use `list_logpoints` for the same target if no ID was returned. A sync timeout
does not cancel creation. Do not create another point merely because waiting ended.

For a mixed deployment, this report fragment means the known revision was
compared successfully and instances without a hash may proceed optimistically:

```json
{
  "sourceVerification": {
    "result": "unknown_revision",
    "runtimeCommitHashes": ["0123456", null]
  }
}
```

If all revisions are unknown, use `runtimeCommitHashes: [null]`. Continue to
supply the inspected local file path and full local HEAD hash. If an unknown
revision gains a hash before dispatch, refresh discovery and compare that
revision rather than carrying forward the assumption that it is unknown.

## Enabling a retained definition

Read the selected definitions from a current `list_logpoints` snapshot or
`get_logpoint`. Enable only disabled points whose
instrumentation is intentionally needed again. Creation, updates and enablement
all require the intended app to be connected; compatibility overrides do not
permit offline instrumentation.

For enablement, use the same blob comparison above against the point's saved
`source.commitHash` as well as each known runtime revision. This ensures the
local line and expressions still correspond to the retained definition. A
missing saved hash prevents enablement; disabled definitions cannot be edited.
An intentionally created replacement must follow the creation workflow.
A changed or unverifiable saved revision requires an explicitly approved
`user_approved_override`, even when runtime hashes are unknown.

Supply one `verifications` entry per selected ID, containing `id`, `source`
(filePath and full local HEAD hash) and `sourceVerification`. The path must match
the saved point. Echo only runtime revisions in `runtimeCommitHashes`; explain
any saved-source mismatch in the override reason. These inputs record fresh
verification without changing the saved source revision, definition, or location.
Do not reuse an old verification report or approval automatically.
