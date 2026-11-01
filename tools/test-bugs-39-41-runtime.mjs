#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-bugs-39-41-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const big = Array(321).fill(0);
big[64] = 11;
big[320] = 77;

const source = `
data T bytes 5,10,15
data Big bytes ${big.join(",")}
data One bytes 66
i16 A[3]
u8 I = 1
u8 R1 = 0
u8 R2 = 0
u16 W16 = 0
i16 W = 0
u8 R = 10
u8 Got = 0
u8 At10 = 0
u8 At2 = 0
u8 Done = 0
A[1] = -10
if A[I] < 0 then R1 = 1
if A[I] > 5 then R2 = 1
W16 = T[I]
I = 2
W = T[I]
screen on
nmi off
copy Big + R * 32 count 1 to vram.name
Got = get char at 0,0
copy One count 1 to vram.name + R * 32 + 5
At10 = get char at 5,10
At2 = get char at 5,2
Done = 1
loop forever
`;

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

function readWord(core, address) {
  const bytes = core.readRam(address, 2);
  return bytes[0] | (bytes[1] << 8);
}

try {
  const sourcePath = join(temp, "bugs-39-41.alexis");
  writeFileSync(sourcePath, source);
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const addresses = Object.fromEntries(["R1", "R2", "W16", "W", "Got", "At10", "At2", "Done"]
      .map((name) => [name, addressOf(asm, `AMY_UVAR_${name}`)]));
    const core = await GearcolecoTestCore.create({ seed: 0x394041 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 30 && core.readRam(addresses.Done, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(addresses.Done, 1)[0], 1, `${profile}: test did not finish`);
      assert.equal(core.readRam(addresses.R1, 1)[0], 1, `${profile}: signed array comparison < 0`);
      assert.equal(core.readRam(addresses.R2, 1)[0], 0, `${profile}: signed array comparison > 5`);
      assert.equal(readWord(core, addresses.W16), 10, `${profile}: data byte to u16`);
      assert.equal(readWord(core, addresses.W), 15, `${profile}: data byte to i16`);
      assert.equal(core.readRam(addresses.Got, 1)[0], 77, `${profile}: ROM source offset must be 320`);
      assert.equal(core.readRam(addresses.At10, 1)[0], 66, `${profile}: VRAM target must be row 10`);
      assert.equal(core.readRam(addresses.At2, 1)[0], 0, `${profile}: VRAM target must not wrap to row 2`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Amy bugs 39-41 runtime: PASS (${profiles.length} optimization profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
