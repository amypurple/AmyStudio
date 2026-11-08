#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `
data Tab bytes
  6, 8, 10, 12, 2, 7, 5, 13
end data
u8 Arr[8]
u8 V = 20
u8 RomResult = 0
u8 RamResult = 0
bcd digits 6 Score = 100000
bcd digits 6 Low = 100
u16 Bonuses[2]
u8 I = 1
u16 Cost = 300
bcd digits 4 Wrap = 9900
u8 Done = 0
  Arr[2] = 3
  RomResult = Tab[(V - 1) / 8]
  RamResult = Arr[(V + 1) / 8]
  Bonuses[I] = 65535
  Score += Bonuses[I]
  Score -= Cost
  Low -= Cost
  Wrap += Bonuses[I]
  Done = 1
  loop forever
`;

function build(sourcePath, asmPath, romPath, profile) {
  return new Promise((resolveBuild, rejectBuild) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      stdio: "inherit"
    });
    child.on("error", rejectBuild);
    child.on("exit", (code) => code === 0 ? resolveBuild() : rejectBuild(new Error(`Compilation failed: ${code}`)));
  });
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing RAM address for ${name}`);
  return Number.parseInt(match[1], 16);
}

const temp = await mkdtemp(join(tmpdir(), "amy-bcd-u16-index-"));
try {
  const sourcePath = join(temp, "repro.alexis");
  await writeFile(sourcePath, source);
  const bios = await readFile(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    await build(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const addresses = Object.fromEntries(["RomResult", "RamResult", "Score", "Low", "Wrap", "Done"]
      .map((name) => [name, addressOf(asm, name)]));
    const core = await GearcolecoTestCore.create({ seed: 0x424344 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 180 && core.readRam(addresses.Done, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(addresses.Done, 1)[0], 1, `${profile}: test did not finish`);
      assert.equal(core.readRam(addresses.RomResult, 1)[0], 10, `${profile}: parenthesized ROM-table division index`);
      assert.equal(core.readRam(addresses.RamResult, 1)[0], 3, `${profile}: parenthesized RAM-array division index`);
      assert.deepEqual([...core.readRam(addresses.Score, 3)], [0x35, 0x52, 0x16], `${profile}: BCD +=/-= u16`);
      assert.deepEqual([...core.readRam(addresses.Low, 3)], [0x00, 0x00, 0x00], `${profile}: BCD -= u16 saturates at zero`);
      assert.deepEqual([...core.readRam(addresses.Wrap, 2)], [0x35, 0x54], `${profile}: narrow BCD wraps at its declared digits`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Amy BCD u16/index regressions: PASS (${profiles.length} optimization profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else await rm(temp, { recursive: true, force: true });
}
