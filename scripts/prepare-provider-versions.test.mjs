import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifests = [
  "package.json", "plugin.json",
  "providers/codex/plugin/.codex-plugin/plugin.json",
  "providers/claude/plugin/.claude-plugin/plugin.json",
  "providers/cursor/plugin/.cursor-plugin/plugin.json",
  "providers/cursor/plugin/plugin.json",
  ".claude-plugin/marketplace.json", ".cursor-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
];

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "toolkit versions "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const file of [...manifests, "AI_TOOLKIT_VERSION", "scripts/prepare-provider-versions.mjs"]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    cpSync(join(project, file), join(root, file));
  }
  const read = (file) => readFileSync(join(root, file), "utf8");
  const write = (file, value) => writeFileSync(join(root, file), value);
  const run = (...args) => spawnSync(process.execPath, [join(root, "scripts/prepare-provider-versions.mjs"), ...args], { encoding: "utf8" });
  return { root, read, write, run };
}

test("one release version updates all provider versions, preserves metadata, and is idempotent", (t) => {
  const { read, write, run } = fixture(t);
  const before = Object.fromEntries(manifests.map((file) => [file, JSON.parse(read(file))]));
  const version = "2.3.4-rc.1+build.5";
  write("AI_TOOLKIT_VERSION", `${version}\n`);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  for (const file of manifests) {
    const expected = before[file];
    if (file === ".cursor-plugin/marketplace.json") expected.metadata.version = version;
    else if (file !== ".agents/plugins/marketplace.json") expected.version = version;
    if (file === ".claude-plugin/marketplace.json") expected.plugins[0].version = version;
    assert.deepEqual(JSON.parse(read(file)), expected, file);
  }
  const prepared = manifests.map(read);
  assert.equal(run("--check").status, 0);
  assert.equal(run().status, 0);
  assert.deepEqual(manifests.map(read), prepared);
});

test("validation reports drift without rewriting manifests", (t) => {
  const { read, write, run } = fixture(t);
  const before = manifests.map(read);
  write("AI_TOOLKIT_VERSION", "3.0.0\n");
  const result = run("--check");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Versions differ/);
  assert.match(result.stderr, /providers\/codex\/plugin\/\.codex-plugin\/plugin.json:version/);
  assert.deepEqual(manifests.map(read), before);
});

test("invalid or missing source versions leave all manifests unchanged", (t) => {
  const { root, read, write, run } = fixture(t);
  const before = manifests.map(read);
  for (const version of ["", "v1.2.3", "1.2", "01.2.3", "1.2.3-01", "1.2.3\n2.0.0"]) {
    write("AI_TOOLKIT_VERSION", version);
    assert.equal(run().status, 1, version);
    assert.deepEqual(manifests.map(read), before);
  }
  rmSync(join(root, "AI_TOOLKIT_VERSION"));
  assert.equal(run().status, 1);
  assert.deepEqual(manifests.map(read), before);
});

test("a malformed target fails before any manifest is rewritten", (t) => {
  const { read, write, run } = fixture(t);
  write("AI_TOOLKIT_VERSION", "3.0.0\n");
  write(".cursor-plugin/marketplace.json", "{\"metadata\":{}}\n");
  const before = manifests.map(read);
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing version field/);
  assert.deepEqual(manifests.map(read), before);
});
