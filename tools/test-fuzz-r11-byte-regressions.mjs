#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "build", "test-fuzz-r11-byte-regressions");
mkdirSync(output, { recursive: true });
const sourcePath = resolve(output, "byte-regressions.alexis");
writeFileSync(sourcePath, `cartridge "FUZZ BYTE/AMY/2026"
u16 W1 = 3
i8 C1 = 126
i8 AC[4]
i8 Shift8 = -128
i16 Shift16 = -256
u8 Div = 200, DivA = 5
i8 LoopValue = 0
u8 UpCount = 0, DownCount = 0
u8 BranchValue = 166, EmptyElse = 0, EmptyThen = 0
AC[0] |= (($905A * W1) & $3F)
Mask(1, 5)
Shift8 >>= 1
Shift16 >>= 1
Div /= ((DivA * DivA) & 7) + 1
for LoopValue = 126 to 127
  inc UpCount
next
for LoopValue = -127 to -128 step -1
  inc DownCount
next
if BranchValue = 1 then
  EmptyElse = 5
elseif BranchValue = 166 then
else
  EmptyElse = 9
end if
if BranchValue = 166 then
  ' Intentionally empty: ELSE must not execute.
else
  EmptyThen = 9
end if
loop forever
sub Mask(u8 Q, u8 R):
  C1 &= (R & $F)
  return
`, "utf8");

const biosPath = process.env.AMY_OS7_BIOS
  ? resolve(process.env.AMY_OS7_BIOS)
  : resolve(root, "studio", "bios", "colecovision.rom");
if (!existsSync(biosPath)) {
  console.log(`r11 byte fuzz regressions: SKIP (real OS7 BIOS not found at ${biosPath}; set AMY_OS7_BIOS)`);
  process.exit(0);
}
const bios = readFileSync(biosPath);
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
for (const profile of profiles) {
  const romPath = resolve(output, `${profile}.rom`);
  const asmPath = resolve(output, `${profile}.asm`);
  const compile = spawnSync(process.execPath, [
    resolve(root, "tools", "amyc.mjs"), sourcePath,
    "--opt", profile, "--rom", romPath, "--asm", asmPath
  ], { cwd: root, encoding: "utf8" });
  assert.equal(compile.error, undefined, compile.error?.message);
  assert.equal(compile.status, 0, compile.stderr || compile.stdout);
  const asm = readFileSync(asmPath, "utf8");
  assert.doesNotMatch(asm, /(?:and|or|xor)\s+[^\r\n]*AMY_(?:UVAR|SPARM)_/i,
    `${profile}: Amy expressions must not leak into assembler immediate operands`);
  assert.match(asm, /sra\s+\(hl\)/i, `${profile}: i8 >>= must use an arithmetic shift`);

  const addresses = Object.fromEntries([...asm.matchAll(/^AMY_UVAR_(\w+)\s+EQU\s+\$([0-9A-F]{4})/gmi)]
    .map((match) => [match[1].toLowerCase(), Number.parseInt(match[2], 16)]));
  const rom = new Uint8Array(readFileSync(romPath));
  rom[0] = 0x55;
  rom[1] = 0xaa;
  const core = await GearcolecoTestCore.create({ seed: 0xF022 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 30; frame += 1) core.runFrame();
    const byte = (name) => core.readRam(addresses[name], 1)[0];
    const word = (name) => {
      const bytes = core.readRam(addresses[name], 2);
      return bytes[0] | (bytes[1] << 8);
    };
    assert.equal(byte("ac"), 14, `${profile}: complex byte |= result`);
    assert.equal(byte("c1"), 4, `${profile}: parameter expression &= result`);
    assert.equal(byte("shift8"), 0xC0, `${profile}: signed byte >>= result`);
    assert.equal(word("shift16"), 0xFF80, `${profile}: signed word >>= result`);
    assert.equal(byte("div"), 100, `${profile}: complex byte /= result`);
    assert.equal(byte("upcount"), 2, `${profile}: signed i8 upward FOR boundary`);
    assert.equal(byte("downcount"), 2, `${profile}: signed i8 downward FOR boundary`);
    assert.equal(byte("emptyelse"), 0, `${profile}: empty ELSEIF branch must reach END IF`);
    assert.equal(byte("emptythen"), 0, `${profile}: empty THEN branch must skip ELSE`);
  } finally {
    core.destroy();
  }
}

console.log(`r11 byte fuzz regressions: PASS (${profiles.length} profiles, runtime verified)`);
