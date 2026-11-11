#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-u16-divmod-fill-"));
const source = `
project "u16 divmod and fill regression"
memory "colecovision_legacy_sdcc"
u16 Values[4]
u16 ZeroWords[2]
u16 A = 1000
u16 Q = 0
u16 R = 0
u16 Q1 = 0
u16 R1 = 99
u8 Done = 0
fill array Values with 1000
fill array ZeroWords with $FFFF count 0
Q = A / 8
R = A mod 8
Q1 = A / 1
R1 = A mod 1
Done = 1
loop forever
`;

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));
  const sourcePath = join(temp, "case.alexis");
  writeFileSync(sourcePath, source);
  for (const profile of profiles) {
    const asmPath = join(temp, `case-${profile}.asm`);
    const romPath = join(temp, `case-${profile}.rom`);
    const result = spawnSync(process.execPath, [
      resolve(root, "tools/amyc.mjs"), sourcePath,
      "--asm", asmPath, "--rom", romPath, "--opt", profile
    ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.doesNotMatch(asm, /call AMY_U16_DIV/i, `${profile}: constant power-of-two used general division`);
    assert.match(asm, /AMY_FILL_ARRAY_WORD_LOOP/i, `${profile}: missing word-fill loop`);
    const core = await GearcolecoTestCore.create({ seed: 0x55313646 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "Done"), 1)[0], 1, `${profile}: program did not finish`);
      const words = core.readRam(addressOf(asm, "Values"), 8);
      assert.deepEqual([...words], [0xE8, 0x03, 0xE8, 0x03, 0xE8, 0x03, 0xE8, 0x03], `${profile}: word fill`);
      assert.deepEqual([...core.readRam(addressOf(asm, "ZeroWords"), 4)], [0, 0, 0, 0], `${profile}: zero-count word fill`);
      assert.deepEqual([...core.readRam(addressOf(asm, "Q"), 2)], [125, 0], `${profile}: quotient`);
      assert.deepEqual([...core.readRam(addressOf(asm, "R"), 2)], [0, 0], `${profile}: remainder`);
      assert.deepEqual([...core.readRam(addressOf(asm, "Q1"), 2)], [0xE8, 0x03], `${profile}: divide by one`);
      assert.deepEqual([...core.readRam(addressOf(asm, "R1"), 2)], [0, 0], `${profile}: modulo one`);
    } finally {
      core.destroy();
    }
  }
  const overrunPath = join(temp, "overrun.alexis");
  writeFileSync(overrunPath, `
u16 Words[8]
u16 Guard = $5A5A
u8 Bytes[8]
u8 Guard8 = $A5
fill array Words with $FFFF count 9
fill array Bytes with 0 count 9
loop forever
`);
  const overrun = spawnSync(process.execPath, [resolve(root, "tools/amyc.mjs"), overrunPath], {
    cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024
  });
  assert.equal(overrun.status, 1, "oversized fill count must fail");
  assert.match(`${overrun.stdout || ""}${overrun.stderr || ""}`, /count 9 exceeds its 8 elements/i);
  console.log(`u16 divmod/fill runtime: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
