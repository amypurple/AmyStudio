#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_INPUT as INPUT, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `u8 Choice = 0

show coleco options
Choice = 1
choose menu 1 to 8 into Choice cursor $3E at 2,6 step 2
loop forever
`;

function compile(sourcePath, asmPath, optimizedPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    let output = "";
    const child = spawn(process.execPath, [
      "tools/amyc.mjs", sourcePath,
      "--asm", asmPath,
      "--optimized-asm", optimizedPath,
      "--rom", romPath,
      "--opt", profile
    ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(output)));
  });
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert(match, `missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

const temp = await mkdtemp(join(tmpdir(), "amy-coleco-options-"));
try {
  const sourcePath = join(temp, "coleco-options.alexis");
  await writeFile(sourcePath, source);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const optimizedPath = join(temp, `${profile}-optimized.asm`);
    const romPath = join(temp, `${profile}.rom`);
    await compile(sourcePath, asmPath, optimizedPath, romPath, profile);
    const [asm, optimized, rom] = await Promise.all([
      readFile(asmPath, "utf8"),
      readFile(optimizedPath, "utf8"),
      readFile(romPath)
    ]);
    assert.match(optimized, /call (?:\$1F7C|8060)\b/i, `${profile}: GAME_OPT call missing`);
    assert.match(optimized, /call AMY_SCREEN_ON_NMI/i, `${profile}: NMI restoration missing`);

    const core = await GearcolecoTestCore.create({ seed: 0x434F4C45 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 180; frame += 1) core.runFrame();
      assert.equal(core.getVdpRegisters()[1] & 0x60, 0x60, `${profile}: display/NMI contract was not restored`);
      const nameBase = (core.getVdpRegisters()[2] & 0x0F) << 10;
      assert.equal(core.readVram(nameBase + 6 * 32 + 2, 1)[0], 0x3E, `${profile}: cursor is not aligned with BIOS option 1`);
      core.setControllerMask(0, INPUT.KEYPAD_3);
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      core.setControllerMask(0, 0);
      for (let frame = 0; frame < 30; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "Choice"), 1)[0], 3, `${profile}: BIOS screen menu did not select option 3`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Show Coleco options: PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
