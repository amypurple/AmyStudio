#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `project "Inline simple statements"
u8 Enabled = 0

sub start:
  text screen
  cls with 0
  if Enabled then put char 99 at 1,1
  if Enabled then fill 99 count 3 at 2,2
  if Enabled then vpoke vram.name + 3, 99
  if Enabled then backdrop red
  Enabled = 1
  if Enabled then put char 65 at 4,4
  if Enabled then fill 66 count 3 at 5,5
  if Enabled then vpoke vram.name + 7, 67
  if Enabled then backdrop blue
  screen on
  loop forever
end sub
`;

function compile(sourcePath, asmPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile
    ], { cwd: root, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Compilation failed: ${code}`)));
  });
}

function parseEqu(asm, name) {
  const match = asm.match(new RegExp(`^${name}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "m"));
  assert.ok(match, `Missing ${name}`);
  return Number.parseInt(match[1], 16);
}

const outputDir = await mkdtemp(join(tmpdir(), "amy-inline-simple-"));
try {
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const sourcePath = join(outputDir, `inline-${profile}.alexis`);
    const asmPath = join(outputDir, `inline-${profile}.asm`);
    const romPath = join(outputDir, `inline-${profile}.rom`);
    await writeFile(sourcePath, source);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, romFile] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    assert.match(asm, /call AMY_PUT_CHAR_AT/i, `${profile}: inline put char`);
    assert.match(asm, /call AMY_FILL_AT/i, `${profile}: inline fill`);
    assert.match(asm, /call AMY_VPOKE/i, `${profile}: inline vpoke`);
    assert.match(asm, /call WRITE_REGISTER/i, `${profile}: inline backdrop`);

    const rom = new Uint8Array(romFile);
    rom[0] = 0x55;
    rom[1] = 0xaa;
    const core = await GearcolecoTestCore.create({ seed: 0x494e4c49 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 90; frame += 1) core.runFrame();
      const nameBase = (core.getVdpRegisters()[2] & 0x0f) << 10;
      assert.equal(core.readVram(nameBase + 33, 1)[0], 0, `${profile}: false put char stayed skipped`);
      assert.deepEqual([...core.readVram(nameBase + 66, 3)], [0, 0, 0], `${profile}: false fill stayed skipped`);
      assert.equal(core.readVram(nameBase + 3, 1)[0], 0, `${profile}: false vpoke stayed skipped`);
      assert.equal(core.readVram(nameBase + 132, 1)[0], 65, `${profile}: true put char ran`);
      assert.deepEqual([...core.readVram(nameBase + 165, 3)], [66, 66, 66], `${profile}: true fill ran`);
      assert.equal(core.readVram(nameBase + 7, 1)[0], 67, `${profile}: true vpoke ran`);
      assert.equal(core.getVdpRegisters()[7] & 0x0f, 4, `${profile}: true backdrop ran`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Inline simple statements runtime: PASS (${profiles.length} optimization profiles)`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
