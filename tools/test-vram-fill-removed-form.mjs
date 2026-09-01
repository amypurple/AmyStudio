import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkVramFillDeprecation } from "../studio/core/compiler/deprecations.js";

const oldForm = "fill vram.pattern with $F0 count 32";
const replacement = "fill $F0 count 32 to vram.pattern";
const deprecated = checkVramFillDeprecation(oldForm, oldForm);
assert.equal(deprecated.handled, true);
assert.equal(deprecated.ok, false);
assert.ok(deprecated.log.includes(`use '${replacement}'`));
assert.equal(checkVramFillDeprecation(replacement, replacement).handled, false);
assert.equal(checkVramFillDeprecation("fill vram.name with sequence $00..$FF repeat 3", "sequence").handled, false);

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-vram-fill-"));
try {
  const source = join(temp, "fill.alexis");
  writeFileSync(source, `${replacement}\nloop forever\n`, "utf8");
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const result = spawnSync(process.execPath, ["tools/amyc.mjs", source, "--rom", join(temp, `${profile}.rom`), "--opt", profile], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log("Removed VRAM fill order and modern replacement PASS (5 profiles).");
