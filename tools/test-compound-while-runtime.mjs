#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-compound-while-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const sourcePath = join(temp, "compound-while.alexis");
writeFileSync(sourcePath, `
u8 A = 3
u8 B = 2
u8 Result = 0
u8 Done = 0

while A > 0 and B > 0
  Result += 1
  A -= 1
  B -= 1
end while

A = 0
B = 2
while A > 0 or B > 0
  Result += 1
  B -= 1
end while

A = 0
B = 0
while A < 2 and B < 3 and Result < 10
  Result += 1
  A += 1
  B += 1
end while

Done = 1
loop forever
`);

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `compound-while-${profile}.asm`);
    const romPath = join(temp, `compound-while-${profile}.rom`);
    const build = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x5748494C });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const doneAddress = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 120 && core.readRam(doneAddress, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(doneAddress, 1)[0], 1, `${profile}: program completed`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Result"), 1)[0], 6, `${profile}: compound loops produced the expected count`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_A"), 1)[0], 2, `${profile}: chained AND stopped on A`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_B"), 1)[0], 2, `${profile}: chained AND preserved B at exit`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Compound WHILE runtime: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
