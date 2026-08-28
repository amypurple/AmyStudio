#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-for-loop-"));
const sourceText = `project "FOR LOOP CODEGEN"
memory "colecovision_legacy_sdcc"
record LoopMemory:
  u16 Padding
  u8 Counter
end record
overlay SceneRam
  Game as LoopMemory
  Menu as LoopMemory
end overlay
u8 Sum = 0
for SceneRam.Game.Counter = 0 to 7
  Sum += SceneRam.Game.Counter
next SceneRam.Game.Counter
if Sum = 28 then
  print at 0,0,"PASS"
else
  print at 0,0,"FAIL"
end if
loop forever
`;

try {
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const source = join(temp, `loop-${profile}.alexis`);
    const asm = join(temp, `loop-${profile}.asm`);
    const rom = join(temp, `loop-${profile}.rom`);
    writeFileSync(source, sourceText);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile} should compile:\n${result.stdout || ""}${result.stderr || ""}${result.error?.stack || ""}`);
    const generated = readFileSync(asm, "utf8");
    assert.match(generated, /AMY_FOR_CONTINUE_[0-9]+:\s*\n\s*ld hl,AMY_OVERLAY_SCENERAM \+ 2\s*\n\s*inc \(hl\)\s*\n\s*ld a,\(hl\)\s*\n\s*cp 8/i,
      `${profile} should use the compact static-address loop for the qualified u8 counter`);
    assert.doesNotMatch(generated, /AMY_FOR_LOOP_[0-9]+:\s*\n\s*ld a,\(AMY_OVERLAY_SCENERAM\)/i,
      `${profile} should not reload the qualified counter for a separate entry guard`);
    assert.doesNotMatch(generated, /AMY_FOR_CONTINUE_[0-9]+:\s*\n\s*ld a,\([^\n]+\)\s*\n\s*ld b,a\s*\n\s*ld a,1\s*\n\s*add a,b/i,
      `${profile} should not use the old five-instruction increment`);
  }
  console.log("qualified u8 for-loop codegen PASS");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
