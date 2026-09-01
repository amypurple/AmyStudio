import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-on-vblank-"));
try {
  const removed = join(temp, "removed.alexis");
  writeFileSync(removed, "on frame Tick\nsub Tick:\n  return\nend sub\nloop forever\n", "utf8");
  const rejected = spawnSync(process.execPath, ["tools/amyc.mjs", removed, "--rom", join(temp, "removed.rom")], { cwd: root, encoding: "utf8" });
  assert.notEqual(rejected.status, 0, "top-level on frame must fail closed");
  assert.match(`${rejected.stdout}${rejected.stderr}`, /use 'on vblank Tick'/i);

  const modern = join(temp, "modern.alexis");
  writeFileSync(modern, "on vblank Tick\nsub Tick:\n  return\nend sub\nloop forever\n", "utf8");
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const result = spawnSync(process.execPath, ["tools/amyc.mjs", modern, "--rom", join(temp, `${profile}.rom`), "--opt", profile], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log("Top-level on frame removal and on vblank replacement PASS (5 profiles).");
