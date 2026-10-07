#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-os7-enlarge-"));
const sourcePath = join(temp, "os7-enlarge.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const pattern = [
  0x18, 0x24, 0x42, 0x81, 0x81, 0x42, 0x24, 0x18,
  0x81, 0x42, 0x24, 0x18, 0x18, 0x24, 0x42, 0x81
];
const colors = [
  0x41, 0x52, 0x63, 0x74, 0x85, 0x96, 0xa7, 0xb8,
  0xb8, 0xa7, 0x96, 0x85, 0x74, 0x63, 0x52, 0x41
];

function doubledByte(value) {
  let expanded = 0;
  for (let bit = 7; bit >= 0; bit -= 1) {
    expanded = (expanded << 2) | (((value >> bit) & 1) ? 3 : 0);
  }
  return [(expanded >> 8) & 0xff, expanded & 0xff];
}

function expectedPattern(source) {
  const output = [];
  for (let offset = 0; offset < source.length; offset += 8) {
    const left = [];
    const right = [];
    for (const value of source.slice(offset, offset + 8)) {
      const [hi, lo] = doubledByte(value);
      left.push(hi, hi);
      right.push(lo, lo);
    }
    output.push(...left, ...right);
  }
  return output;
}

function expectedColors(source) {
  const output = [];
  for (let offset = 0; offset < source.length; offset += 8) {
    const doubledRows = source.slice(offset, offset + 8).flatMap((value) => [value, value]);
    output.push(...doubledRows, ...doubledRows);
  }
  return output;
}

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

writeFileSync(sourcePath, `project "OS7 ENLARGE PATTERN TEST"
memory "colecovision_legacy_sdcc"

data SourcePattern bytes
  ${pattern.map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",")}
end data
data SourceColors bytes
  ${colors.map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",")}
end data

u8 NmiOffBefore = 0
u8 NmiOffState = 0
u8 NmiOnState = 0
u8 Done = 0

sub start:
  ' Reserve the NMI/VDP critical-section state used by this internal ASM test.
  wait
  tile screen
  asm {
    call AMY_SCREEN_OFF_NO_NMI
  }
  NmiOffBefore = peek($73C4)
  define chars SourcePattern at 0 count 2
  define colors SourceColors at 0 count 2
  asm {
    call AMY_VRAM_BEGIN
    ld de,0
    ld hl,16
    ld bc,2
    call AMY_ENLARGE_PATTERN
    call AMY_VRAM_END
  }
  NmiOffState = peek($73C4)
  screen on
  asm {
    call AMY_VRAM_BEGIN
    ld de,0
    ld hl,24
    ld bc,2
    call AMY_ENLARGE_PATTERN
    call AMY_VRAM_END
  }
  NmiOnState = peek($73C4)
  Done = 1
  loop forever
end sub
`);

let passed = false;
try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  const expectedPatterns = expectedPattern(pattern);
  const expectedColorBytes = expectedColors(colors);
  for (const profile of profiles) {
    const asmPath = join(temp, `os7-enlarge-${profile}.asm`);
    const romPath = join(temp, `os7-enlarge-${profile}.rom`);
    const build = spawnSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.ok(addressOf(asm, "AMY_RAM_BASE") >= 0x702b, `${profile}: user RAM follows 40-byte work buffer and NMI state`);
    const core = await GearcolecoTestCore.create({ seed: 0x454e4c47 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const done = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 60 && core.readRam(done, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(done, 1)[0], 1, `${profile}: completion marker`);
      assert.deepEqual([...core.readVram(16 * 8, 64)], expectedPatterns, `${profile}: NMI-off PATTERN enlargement`);
      assert.deepEqual([...core.readVram(24 * 8, 64)], expectedPatterns, `${profile}: NMI-on PATTERN enlargement`);
      assert.deepEqual([...core.readVram(0x2000 + 16 * 8, 64)], expectedColorBytes, `${profile}: NMI-off COLOR enlargement`);
      assert.deepEqual([...core.readVram(0x2000 + 24 * 8, 64)], expectedColorBytes, `${profile}: NMI-on COLOR enlargement`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_NmiOffBefore"), 1)[0] & 0x20, 0, `${profile}: explicit NMI-off precondition`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_NmiOffState"), 1)[0] & 0x20, 0, `${profile}: NMI-off state restored`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_NmiOnState"), 1)[0] & 0x20, 0x20, `${profile}: NMI-on state restored`);
    } finally {
      core.destroy();
    }
  }
  console.log(`OS7 ENLARGE PATTERN/COLOR ROM: PASS (${profiles.length} profiles, NMI off/on)`);
  passed = true;
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP || !passed) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
