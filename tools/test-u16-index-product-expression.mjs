#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-u16-expressions-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `
u8 Arr[300]
u8 K = 200
u8 X = 1
u8 R = 0
u8 V = 0
u16 B = 260
u16 S = 0
u16 T = 0
u8 Done = 0
Arr[B + X] = 7
if Arr[B + X] == 7 then R = 1
V = Arr[B + X]
if Arr[B + 1] == 7 then R += 2
S = K * K
S = S + K * K
T = K * K
S = S + T * K
S = K * K + S
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
  const sourcePath = join(temp, "u16-expressions.alexis");
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
    const addresses = Object.fromEntries(["Arr", "K", "R", "V", "S", "T", "Done"]
      .map((name) => [name, addressOf(asm, `AMY_UVAR_${name}`)]));
    const core = await GearcolecoTestCore.create({ seed: 0x4243 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 30 && core.readRam(addresses.Done, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(addresses.Done, 1)[0], 1, `${profile}: test did not finish`);
      assert.equal(core.readRam(addresses.Arr + 261, 1)[0], 7, `${profile}: u16 expression array write`);
      assert.equal(core.readRam(addresses.V, 1)[0], 7, `${profile}: u16 expression array read`);
      assert.equal(core.readRam(addresses.R, 1)[0], 3, `${profile}: u16 expression array comparisons`);
      assert.equal(readWord(core, addresses.T), 40000, `${profile}: standalone product`);
      assert.equal(readWord(core, addresses.S), 59072, `${profile}: nested product sums`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Amy u16 index/product expressions: PASS (${profiles.length} optimization profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
