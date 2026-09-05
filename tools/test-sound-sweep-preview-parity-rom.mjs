import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { eventDurationFrames } from "../studio/core/colecoSoundPreview.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-sound-sweep-parity-"));
const sourcePath = path.join(temp, "sound-sweep-parity.alexis");
const romPath = path.join(temp, "sound-sweep-parity.rom");

fs.writeFileSync(sourcePath, `
sub start:
  text screen
  screen on
  set sound table SweepTable areas 1
  play sound 1
  loop forever

asm {
SweepTable:
  dw SweepSound,$702B

SweepSound:
  db $41,$00,$01,$04,$32,$01,$50
}
`);

try {
  execFileSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--rom", romPath, "--opt", "balanced"], {
    cwd: root,
    stdio: "pipe"
  });
  const core = await GearcolecoTestCore.create({ seed: 0x5100D });
  try {
    core.loadBios(fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom")));
    core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    const periods = [];
    let activeFrame = -1;
    for (let frame = 0; frame < 40; frame += 1) {
      core.runFrame();
      const area = core.readRam(0x702b, 10);
      if (activeFrame < 0 && area[0] !== 0xff) activeFrame = frame;
      if (activeFrame >= 0) periods.push(area[3] | ((area[4] & 0x03) << 8));
      if (activeFrame >= 0 && area[0] === 0xff) break;
    }
    assert.ok(activeFrame >= 0, "sweep sound must enter BIOS area 1");
    const changes = [];
    for (let index = 1; index < periods.length; index += 1) {
      if (periods[index] !== periods[index - 1]) changes.push(index);
    }
    assert.deepEqual(changes, [2, 5, 8], `BIOS applies length-1 sweep steps after first=2, then every=3 frames; periods=${periods.join(",")}`);
    assert.equal(eventDurationFrames({
      length: 4,
      frequencySweep: { firstLength: 2, stepLength: 3, step: 1 }
    }), 11, "preview duration must include the final 3-frame hold before command advance");
  } finally {
    core.destroy();
  }
  console.log("Sound sweep preview/BIOS ROM parity PASS");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
