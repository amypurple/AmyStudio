import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkDisplayGraphicsDeprecation } from "../studio/core/compiler/deprecations.js";

const removed = [
  ["graphics mode 1", "bitmap screen"],
  ["graphics mode 1 color $F1", "bitmap screen color $F1"],
  ["graphics mode 2 bitmap", "picture screen"],
  ["graphics mode 2 text", "mode 2 screen"],
  ["graphics mode 2 screen", "mode 2 screen"],
  ["graphics multicolor", "multicolor screen"],
  ["graphics mode 3 multicolor", "multicolor screen"],
  ["graphics mode 3", "multicolor screen"]
];

for (const [source, replacement] of removed) {
  const result = checkDisplayGraphicsDeprecation(source, source);
  assert.equal(result.handled, true, `${source} must be recognized as removed`);
  assert.equal(result.ok, false, `${source} must fail closed`);
  assert.ok(result.log.includes(`use '${replacement}'`), `${source} must suggest ${replacement}`);
}

for (const source of ["bitmap screen", "picture screen", "mode 2 screen", "multicolor screen", "graphics mode 1 text"]) {
  assert.equal(checkDisplayGraphicsDeprecation(source, source).handled, false, `${source} remains valid`);
}

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-multicolor-r1-"));
try {
  const source = join(temp, "multicolor-r1.alexis");
  writeFileSync(source, "multicolor screen\nsprites 8x8\nloop forever\n", "utf8");
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const asm = join(temp, `${profile}.asm`);
    const rom = join(temp, `${profile}.rom`);
    const result = spawnSync(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}`);
    assert.match(
      readFileSync(asm, "utf8"),
      /AMY_SET_SPRITES8X8:[\s\S]*?ld a,\(\$73C4\)[\s\S]*?and \$FD[\s\S]*?ld \(\$73C4\),a[\s\S]*?ld b,1[\s\S]*?(?:jp|call) WRITE_REGISTER/i,
      `${profile}: sprites 8x8 must preserve the tracked multicolor mode bits and clear only the sprite-size bit`
    );
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log("Removed graphics mode forms and multicolor R1 tracking PASS (5 profiles).");
