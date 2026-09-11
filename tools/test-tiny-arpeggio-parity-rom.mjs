import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { tinyNotePeriodAtFrame } from "../studio/core/colecoTinySound.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-tiny-arpeggio-"));
const sourcePath = path.join(temp, "tiny-arpeggio.alexis");
const romPath = path.join(temp, "tiny-arpeggio.rom");
const baseCode = 0x5f;
const secondCode = 0x13;

fs.writeFileSync(sourcePath, `sub start:
  text screen
  screen on
  set sound table TinyTable areas 1
  play sound 1
  loop forever

asm {
TinyTable:
  dw Arpeggio,$702B
Arpeggio:
  db $44
  dw sndtiny_1
  db $10,$02,$00,$00,$00,$5F,$13,$01,$FF
}
`);

try {
  execFileSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--rom", romPath, "--opt", "balanced"], { cwd: root, stdio: "pipe" });
  const core = await GearcolecoTestCore.create({ seed: 0x41525047 });
  try {
    core.loadBios(fs.readFileSync(path.join(root, "studio/bios/colecovision.rom")));
    core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    const observed = [];
    for (let frame = 0; frame < 80 && observed.length < 12; frame += 1) {
      core.runFrame();
      const area = core.readRam(0x702b, 10);
      if (area[0] !== 0xff && (area[4] >> 4) < 15) observed.push(area[3] | ((area[4] & 3) << 8));
    }
    assert.equal(observed.length, 12, "arpeggio must remain active long enough to observe its phase cycle");
    const cycle = Array.from({ length: 8 }, (_, frame) => tinyNotePeriodAtFrame(baseCode, secondCode, frame));
    const matchesRotation = cycle.some((_, phase) => observed.every((period, index) => period === cycle[(phase + index) & 7]));
    assert.ok(matchesRotation, `preview arpeggio must match Tiny runtime: observed ${observed.join(",")}, expected a rotation of ${cycle.join(",")}`);
  } finally {
    core.destroy();
  }
  console.log("Tiny Sound arpeggio preview/ROM parity PASS");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
