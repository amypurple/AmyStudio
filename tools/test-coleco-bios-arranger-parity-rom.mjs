import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildColecoBiosArrangement, scheduleColecoBiosArrangement } from "../studio/core/colecoBiosArranger.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { inspectSoundTableSource } from "../studio/core/soundTableInspector.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-bios-arranger-parity-"));
const sourcePath = path.join(temp, "bios-arranger-parity.alexis");
const romPath = path.join(temp, "bios-arranger-parity.rom");
const soundAsm = `
ParityTable:
  dw Area1First,$702B
  dw Area2Voice,$7035
  dw Area1Replacement,$702B

Area1First:
  db $40,$00,$21,$14,$50
Area2Voice:
  db $80,$80,$21,$14,$90
Area1Replacement:
  db $40,$00,$32,$0A,$50
`;

fs.writeFileSync(sourcePath, `
sub start:
  text screen
  screen on
  set sound table ParityTable areas 2
  play sounds 1,2
  wait 6 frames
  play sound 3
  loop forever

asm {${soundAsm}}
`);

function period(area) {
  return area[3] | ((area[4] & 0x03) << 8);
}

try {
  const inspection = inspectSoundTableSource(soundAsm);
  assert.equal(inspection.tables.length, 1, "fixture must contain one inspectable sound table");
  const arrangement = buildColecoBiosArrangement(inspection.tables[0]);
  const planned = scheduleColecoBiosArrangement(arrangement, [1, 2, 3], { 1: 0, 2: 0, 3: 6 });
  assert.deepEqual(
    planned.map((event) => [event.soundIndex, event.soundArea, event.startFrame, event.length]),
    [[1, 1, 0, 6], [2, 2, 0, 20], [3, 1, 6, 10]],
    "arranger must preserve independent areas and clip the replaced area"
  );

  execFileSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--rom", romPath, "--opt", "balanced"], {
    cwd: root,
    stdio: "pipe"
  });
  const core = await GearcolecoTestCore.create({ seed: 0xB105A });
  try {
    core.loadBios(fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom")));
    core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    const observations = [];
    let firstActiveFrame = -1;
    for (let frame = 0; frame < 40; frame += 1) {
      core.runFrame();
      const area1 = core.readRam(0x702b, 10);
      const area2 = core.readRam(0x7035, 10);
      if (firstActiveFrame < 0 && area1[0] !== 0xff && area2[0] !== 0xff) firstActiveFrame = frame;
      if (firstActiveFrame >= 0) {
        observations.push({
          elapsed: frame - firstActiveFrame,
          area1Active: area1[0] !== 0xff,
          area2Active: area2[0] !== 0xff,
          area1Period: period(area1),
          area2Period: period(area2)
        });
      }
      if (observations.some((sample) => sample.area1Period === 0x200) && area2[0] === 0xff) break;
    }

    assert.ok(firstActiveFrame >= 0, "both independent BIOS sound areas must become active");
    assert.ok(observations.some((sample) => sample.area1Period === 0x100 && sample.area2Period === 0x180),
      "the two original voices must coexist in separate BIOS areas");
    const replacement = observations.find((sample) => sample.area1Period === 0x200);
    assert.ok(replacement, "the later sound must replace area 1");
    assert.ok(replacement.elapsed >= 5 && replacement.elapsed <= 7,
      `area 1 replacement must occur after the six-frame wait, observed at ${replacement.elapsed}`);
    assert.equal(replacement.area2Active, true, "replacing area 1 must not stop area 2");
    assert.equal(replacement.area2Period, 0x180, "area 2 must retain its original voice");
  } finally {
    core.destroy();
  }
  console.log("Coleco BIOS arranger/ROM parity PASS");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
