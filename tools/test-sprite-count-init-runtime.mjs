#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `project "Sprite count initialization"
set sprite 0 to 80,80,0,15
update sprites
forever:
  goto forever
`;

function compile(sourcePath, asmPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    let output = "";
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`compile failed: ${profile}\n${output}`)));
  });
}

const temp = await mkdtemp(join(tmpdir(), "amy-sprite-count-init-"));
try {
  const sourcePath = join(temp, "sprite-count.alexis");
  const bios = await readFile(join(root, "studio", "bios", "colecovision.rom"));
  await writeFile(sourcePath, source, "utf8");
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const countMatch = asm.match(/^AMY_SPRITE_COUNT\s+EQU\s+\$([0-9A-Fa-f]{4})$/m);
    assert.ok(countMatch, `${profile}: sprite count symbol missing`);
    assert.match(asm, /Start:[\s\S]*?xor a\s+ld \(AMY_SPRITE_COUNT\),a[\s\S]*?call AMY_UPDATE_SPRITES/i, `${profile}: startup does not initialize sprite count before upload`);
    const countAddress = Number.parseInt(countMatch[1], 16);
    const core = await GearcolecoTestCore.create({ seed: 0x53505249 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      core.writeRam(countAddress, [97]);
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.equal(core.readRam(countAddress, 1)[0], 0, `${profile}: startup retained garbage sprite count`);
      assert.equal(core.readVram(0x1B00, 1)[0], 0xD0, `${profile}: zero sprites must terminate the SAT immediately`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Sprite count initialization runtime PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
