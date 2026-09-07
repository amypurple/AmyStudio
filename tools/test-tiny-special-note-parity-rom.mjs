import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { decodeTinySoundSource } from "../studio/core/colecoTinySound.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-tiny-special-note-"));
const sourcePath = path.join(temp, "tiny-special.alexis");
const romPath = path.join(temp, "tiny-special.rom");
const stream = "Special:\n  db $44\n  dw sndtiny_1\n  db $08,$03,$10,$20,$04,$21,$02,$13,$22,$01,$FF\n";

fs.writeFileSync(sourcePath, `sub start:
  text screen
  screen on
  set sound table TinyTable areas 1
  play sound 1
  loop forever

asm {
TinyTable:
  dw Special,$702B
${stream}}
`);

try {
  execFileSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--rom", romPath, "--opt", "balanced"], { cwd: root, stdio: "pipe" });
  const expected = decodeTinySoundSource(stream, "Special").previewEvents[0];
  const core = await GearcolecoTestCore.create({ seed: 0x53504543 });
  try {
    core.loadBios(fs.readFileSync(path.join(root, "studio/bios/colecovision.rom")));
    core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    const observed = [];
    let nonZeroSamples = 0;
    let active = false;
    for (let frame = 0; frame < 40; frame += 1) {
      core.runFrame();
      for (const sample of core.getAudioFrame().samples) if (sample !== 0) nonZeroSamples += 1;
      const area = core.readRam(0x702b, 10);
      if (!active && area[0] !== 0xff && area[3] === 0x10) active = true;
      if (active) observed.push({ period: area[3] | ((area[4] & 3) << 8), attenuation: area[4] >> 4 });
      if (active && observed.length >= 8) break;
    }
    assert.equal(observed.length, 8, "special note must remain observable for its eight-frame tempo");
    assert.ok(nonZeroSamples > 0, "special note must produce PCM in GearColeco");
    const periodChanges = [];
    const attenuationChanges = [];
    for (let index = 1; index < observed.length; index += 1) {
      if (observed[index].period !== observed[index - 1].period) periodChanges.push({ frame: index, period: observed[index].period });
      if (observed[index].attenuation !== observed[index - 1].attenuation) attenuationChanges.push({ frame: index, attenuation: observed[index].attenuation });
    }
    assert.deepEqual(periodChanges, expected.frequencyFrames, `browser model must match BIOS twang: ${JSON.stringify(observed)}`);
    assert.deepEqual(attenuationChanges, [{ frame: 2, attenuation: 3 }, { frame: 4, attenuation: 4 }],
      `browser model must match BIOS attenuation sweep: ${JSON.stringify(observed)}`);
  } finally {
    core.destroy();
  }
  console.log("Tiny Sound $03 preview/BIOS ROM parity PASS");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
