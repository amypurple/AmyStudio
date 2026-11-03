#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-u16-high-byte-"));
const source = join(temp, "u16-high-byte.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "U16 HIGH BYTE ROM"
memory "colecovision_legacy_sdcc"
u16 Input0 = 0
u16 Input1 = 255
u16 Input2 = 256
u16 Input3 = 4660
u16 Input4 = 65535
u16 Div0 = 0
u16 Div1 = 0
u16 Div2 = 0
u16 Div3 = 0
u16 Div4 = 0
u16 Shift0 = 0
u16 Shift1 = 0
u16 Shift2 = 0
u16 Shift3 = 0
u16 Shift4 = 0

sub start:
  Div0 = Input0 / 256
  Div1 = Input1 / 256
  Div2 = Input2 / 256
  Div3 = Input3 / 256
  Div4 = Input4 / 256
  Shift0 = Input0 >> 8
  Shift1 = Input1 >> 8
  Shift2 = Input2 >> 8
  Shift3 = Input3 >> 8
  Shift4 = Input4 >> 8
  loop forever
end sub
`);

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `u16-high-byte-${profile}.asm`);
    const romPath = join(temp, `u16-high-byte-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.doesNotMatch(asm, /call\s+AMY_U16_DIV/i, `${profile}: /256 retained the general divider`);
    const core = await GearcolecoTestCore.create({ seed: 0x55313648 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 240; frame += 1) core.runFrame();
      const readWord = (name) => {
        const bytes = core.readRam(addressOf(asm, `AMY_UVAR_${name}`), 2);
        return bytes[0] | (bytes[1] << 8);
      };
      const expected = [0, 0, 1, 18, 255];
      assert.deepEqual(expected.map((_, index) => readWord(`Div${index}`)), expected, `${profile}: /256 results`);
      assert.deepEqual(expected.map((_, index) => readWord(`Shift${index}`)), expected, `${profile}: >>8 results`);
    } finally {
      core.destroy();
    }
  }
  console.log(`u16 high-byte codegen ROM: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files in ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
