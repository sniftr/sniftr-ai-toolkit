import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
  ["package.json", ["version"]],
  ["plugin.json", ["version"]],
  ["providers/codex/plugin/.codex-plugin/plugin.json", ["version"]],
  ["providers/claude/plugin/.claude-plugin/plugin.json", ["version"]],
  ["providers/cursor/plugin/.cursor-plugin/plugin.json", ["version"]],
  ["providers/cursor/plugin/plugin.json", ["version"]],
  [".claude-plugin/marketplace.json", ["version", "plugins.0.version"]],
  [".cursor-plugin/marketplace.json", ["metadata.version"]],
];

// Codex's marketplace points to the versioned plugin manifest; it has no
// separate catalog version. Keep provider-specific fields in their manifests.
const number = "(?:0|[1-9][0-9]*)";
const identifier = `(?:${number}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)`;
const semver = new RegExp(
  `^${number}\\.${number}\\.${number}(?:-${identifier}(?:\\.${identifier})*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`,
);

async function prepare() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) {
    throw new Error("Usage: node scripts/prepare-provider-versions.mjs [--check]");
  }
  const check = args[0] === "--check";
  const version = (await readFile(resolve(repoRoot, "AI_TOOLKIT_VERSION"), "utf8")).trim();
  if (!semver.test(version)) {
    throw new Error("AI_TOOLKIT_VERSION must contain a semantic version, such as 0.1.0");
  }

  // Read and validate every target before writing any changes.
  const updates = await Promise.all(targets.map(async ([file, fields]) => {
    const path = resolve(repoRoot, file);
    const manifest = JSON.parse(await readFile(path, "utf8"));
    const stale = [];
    for (const field of fields) {
      const keys = field.split(".");
      const key = keys.pop();
      const parent = keys.reduce((value, part) => value?.[part], manifest);
      if (typeof parent?.[key] !== "string") {
        throw new Error(`Missing version field ${file}:${field}`);
      }
      if (parent[key] !== version) {
        stale.push(`${file}:${field}`);
        parent[key] = version;
      }
    }
    return { path, manifest, stale };
  }));

  const stale = updates.flatMap((update) => update.stale);
  if (check && stale.length) {
    throw new Error(`Versions differ from AI_TOOLKIT_VERSION (${version}):\n${stale.join("\n")}\nRun npm run prepare:versions.`);
  }
  if (!check) {
    for (const { path, manifest, stale } of updates) {
      if (stale.length) await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
    }
  }
  console.log(`${check ? "Validated" : "Prepared"} provider versions: ${version}`);
}

prepare().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
