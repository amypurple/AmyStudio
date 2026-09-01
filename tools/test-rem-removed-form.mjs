import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-rem-"));
try {
  const removed = join(temp, "removed.alexis");
  writeFileSync(removed, "REM old comment\nloop forever\n", "utf8");
  const rejected = spawnSync(process.execPath, ["tools/amyc.mjs", removed, "--rom", join(temp, "removed.rom")], { cwd: root, encoding: "utf8" });
  assert.notEqual(rejected.status, 0, "REM must fail closed");
  assert.match(`${rejected.stdout}${rejected.stderr}`, /'rem' was removed; use a single-quote comment/i);

  const modern = join(temp, "modern.alexis");
  writeFileSync(modern, `' modern comment\ntext screen\nprint at 0,0, "REM"\nloop forever\n`, "utf8");
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const result = spawnSync(process.execPath, ["tools/amyc.mjs", modern, "--rom", join(temp, `${profile}.rom`), "--opt", profile], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log("Removed REM comments and apostrophe replacement PASS (5 profiles).");
