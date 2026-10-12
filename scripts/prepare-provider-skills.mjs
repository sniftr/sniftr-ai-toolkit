import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(repoRoot, "skills");
const targets = [
  resolve(repoRoot, "providers/codex/plugin/skills"),
  resolve(repoRoot, "providers/claude/plugin/skills"),
  resolve(repoRoot, "providers/cursor/plugin/skills"),
];

for (const target of targets) {
  await rm(target, { force: true, recursive: true });
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });
  console.log(`Prepared ${target}`);
}
