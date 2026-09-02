#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `u8 Value = 0
u8 Failures = 0
Value = 0
if Value = 1 then Failures += 1
if Value <> 1 then Failures += 0 else Failures += 1
Value = 1
if Value <> 1 then Failures += 1
if Value = 1 then Failures += 0 else Failures += 1
Value = 2
if Value = 1 then Failures += 1
if Value <> 1 then Failures += 0 else Failures += 1
Value = 255
if Value = 1 then Failures += 1
if Value <> 1 then Failures += 0 else Failures += 1
loop forever
`;

function compile(sourcePath, asmPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      stdio: "ignore"
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`compile failed: ${profile}`)));
  });
}

const output = await mkdtemp(join(tmpdir(), "amy-compare-1-"));
try {
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const sourcePath = join(output, `${profile}.alexis`);
    const asmPath = join(output, `${profile}.asm`);
    const romPath = join(output, `${profile}.rom`);
    await writeFile(sourcePath, source);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    assert.match(asm, /ld a,\(AMY_UVAR_Value\)\s+dec a\s+jp [zn]z,/i, `${profile}: missing compare-to-1 specialization`);
    assert.doesNotMatch(asm, /ld a,\(AMY_UVAR_Value\)\s+cp (?:1|\$0*1)\b/i, `${profile}: retained CP 1`);
    const failureMatch = asm.match(/^AMY_UVAR_Failures\s+EQU\s+\$([0-9A-Fa-f]+)/m);
    assert.ok(failureMatch, `${profile}: missing Failures symbol`);
    rom[0] = 0x55;
    rom[1] = 0xaa;
    const core = await GearcolecoTestCore.create({ seed: 0x310001 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 5; frame += 1) core.runFrame();
      assert.equal(core.readRam(Number.parseInt(failureMatch[1], 16), 1)[0], 0, `${profile}: comparison result changed`);
    } finally {
      core.destroy();
    }
  }
  console.log("Compare-to-1 specialization PASS (5 profiles, runtime checked)");
} finally {
  await rm(output, { recursive: true, force: true });
}
