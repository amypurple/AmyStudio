#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-mode3-line-runtime-"));
const source = join(temp, "amy-mode3-line-runtime.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const expected = {
  T1a: 0x0A, T1b: 0x0A, T1c: 0x0A,
  T2: 0x0B,
  T3a: 0x0C, T3b: 0x0C,
  T4a: 0x03, T4b: 0x03,
  T5a: 0x02, T5b: 0x02,
  T6a: 0x05, T6b: 0x05, T6c: 0x05
};

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  writeFileSync(source, `project "MODE 3 LINE RUNTIME"
memory "colecovision_legacy_sdcc"

u8 T1a = 0, T1b = 0, T1c = 0
u8 T2 = 0
u8 T3a = 0, T3b = 0
u8 T4a = 0, T4b = 0
u8 T5a = 0, T5b = 0
u8 T6a = 0, T6b = 0, T6c = 0

sub start:
  multicolor screen
  cls
  line 10,8 to 20,8 color $A
  line 25,15 to 25,15 color $B
  line 0,0 to 7,7 color $C
  line 4,5 to 6,15 color $3
  line 55,20 to 75,25 color $2
  box 40,30 to 50,40 color $5
  T1a = pget 10,8
  T1b = pget 15,8
  T1c = pget 20,8
  T2 = pget 25,15
  T3a = pget 0,0
  T3b = pget 7,7
  T4a = pget 4,5
  T4b = pget 6,15
  T5a = pget 55,20
  T5b = pget 63,22
  T6a = pget 40,30
  T6b = pget 45,35
  T6c = pget 50,40
  loop forever
end sub
`);
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `mode3-line-${profile}.asm`);
    const romPath = join(temp, `mode3-line-${profile}.rom`);
    const result = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x4D334C4E });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const addresses = Object.fromEntries(Object.keys(expected).map(symbol => [symbol, addressOf(asm, symbol)]));
      let observed = {};
      for (let frame = 0; frame < 300; frame += 1) {
        core.runFrame();
        observed = Object.fromEntries(Object.entries(addresses).map(([symbol, address]) => [symbol, core.readRam(address, 1)[0]]));
        if (Object.entries(expected).every(([symbol, value]) => observed[symbol] === value)) break;
      }
      assert.deepEqual(observed, expected, `${profile}: Mode 3 line and box readback`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Mode 3 line/box runtime: PASS (${Object.keys(expected).length} checks x ${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
