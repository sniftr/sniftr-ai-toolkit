# Repository instructions

Read [AI interface guidelines](https://github.com/talshapiro/sniftr/blob/main/docs/development/ai-interface-guidelines.md) before
changing skills, references, or their distribution. The golden source for that
standard and all `skills/` content is the `sniftr` repository. This repo receives
end-user skill copies only; make workflow, tool-usage, and runtime-reference corrections upstream.
Do not edit synced root skills or provider skill copies independently.

This repository owns provider manifests, installation instructions, Kiro-specific
packaging guidance, provider preparation, validation, and publishing. Keep
packaging guidance consistent with the shared content rather than duplicating
its workflow or runtime tutorials.

This repository also owns `AI_TOOLKIT_VERSION` and toolkit release versioning.
For each new toolkit release, including releases with updated skills, bump the
version here and run `npm run prepare:versions` to update provider manifests.
Receiving skill changes from `sniftr` does not automatically bump the version.

After receiving source changes, run `npm run prepare:skills` here before installing,
validating, or packaging provider plugins, then follow [CONTRIBUTING.md](CONTRIBUTING.md)
for provider validation. Preparing packages does not authorize committing or
publishing them.
