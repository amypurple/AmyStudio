#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-claude-afternoon-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const words = Array.from({ length: 300 }, (_, index) => index);
const source = join(temp, "afternoon.alexis");
writeFileSync(source, `
u8 Compare = 0
u8 Subtract = 0
u8 X = 100
u16 V = 0
u16 Va = $3A00
u8 ReadBack = 0
u8 WordIndex8 = 200
u16 WordIndex16 = 270
u16 WordResult8 = 0
u16 WordResult16 = 0
u8 Buffer[8]
u8 BoxA = 252
u8 BoxB = 250
u8 BoxHit1 = 0
u8 BoxHit2 = 0
u8 Done = 0
  tile screen
  if X + 190 > 250 then Compare = 1
  if X - 190 < 0 then Subtract = 1
  vpoke Va, 77
  vpeek $3A00 into ReadBack
  vpoke vram.name, 88
  copy vram.name count 1 to Buffer + 3
  sprites 16x16
  set sprite 3 to 10,20,0,6
  V = sprite 3 x
  WordResult8 = BigWords[WordIndex8]
  WordResult16 = BigWords[WordIndex16]
  if box BoxA,60 size 2,2 collides with box BoxB,56 size 16,8 then BoxHit1 = 1
  if box BoxB,56 size 16,8 collides with box BoxA,60 size 2,2 then BoxHit2 = 1
  Done = 1
loop1:
  goto loop1
data BigWords words = ${words.join(",")}
`);

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing RAM address for ${name}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, ["tools/amyc.mjs", source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(build.status, 0, `${profile}: ${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x41465452 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 12; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "Done"), 1)[0], 1, `${profile}: completed`);
      assert.equal(core.readRam(addressOf(asm, "Compare"), 1)[0], 1, `${profile}: u8 addition widened for comparison`);
      assert.equal(core.readRam(addressOf(asm, "Subtract"), 1)[0], 1, `${profile}: u8 subtraction kept mathematical sign`);
      assert.equal(core.readRam(addressOf(asm, "ReadBack"), 1)[0], 77, `${profile}: plain VRAM address`);
      assert.equal(core.readRam(addressOf(asm, "Buffer"), 8)[3], 88, `${profile}: VRAM copy to RAM offset`);
      const word = core.readRam(addressOf(asm, "V"), 2);
      assert.equal(word[0] | (word[1] << 8), 20, `${profile}: sprite byte widened to u16`);
      const table8 = core.readRam(addressOf(asm, "WordResult8"), 2);
      assert.equal(table8[0] | (table8[1] << 8), 200, `${profile}: byte index into long word table`);
      const table16 = core.readRam(addressOf(asm, "WordResult16"), 2);
      assert.equal(table16[0] | (table16[1] << 8), 270, `${profile}: word index into long word table`);
      assert.equal(core.readRam(addressOf(asm, "BoxHit1"), 1)[0], 1, `${profile}: right-edge box overlap`);
      assert.equal(core.readRam(addressOf(asm, "BoxHit2"), 1)[0], 1, `${profile}: symmetric right-edge box overlap`);
    } finally {
      core.destroy();
    }
  }

  const invalidSource = join(temp, "invalid-lowword.alexis");
  writeFileSync(invalidSource, "bcd digits 6 Score = 0\nu16 R = 0\nR = lowword Score\n");
  const invalid = spawnSync(process.execPath, ["tools/amyc.mjs", invalidSource, "--opt", "balanced"], { cwd: root, encoding: "utf8" });
  assert.notEqual(invalid.status, 0, "lowword on BCD must fail before assembly");
  assert.doesNotMatch(`${invalid.stdout || ""}${invalid.stderr || ""}`, /Invalid expression: lowword/i);

  const sparseSoundSource = join(temp, "sparse-sound.alexis");
  writeFileSync(sparseSoundSource, `set sound table Sounds areas 2
loop forever
asm {
Sounds:
  dw ToneA,$702B
  dw ToneB,$703F
ToneA:
  db $F0
ToneB:
  db $F0
}
`);
  const sparseSound = spawnSync(process.execPath, ["tools/amyc.mjs", sparseSoundSource, "--opt", "balanced"], { cwd: root, encoding: "utf8" });
  assert.equal(sparseSound.status, 0, `sparse sound areas should compile: ${sparseSound.stdout || ""}${sparseSound.stderr || ""}`);

  const unsafeSoundSource = join(temp, "unsafe-sound.alexis");
  writeFileSync(unsafeSoundSource, `set sound table Sounds areas 1
loop forever
asm {
Sounds:
  dw ToneA,$7085
ToneA:
  db $F0
}
`);
  const unsafeSound = spawnSync(process.execPath, ["tools/amyc.mjs", unsafeSoundSource, "--opt", "balanced"], { cwd: root, encoding: "utf8" });
  assert.notEqual(unsafeSound.status, 0, "sound areas overlapping Amy runtime RAM must fail");
  assert.match(`${unsafeSound.stdout || ""}${unsafeSound.stderr || ""}`, /outside the 8 OS7 sound areas/i);

  console.log(`Claude afternoon runtime: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
