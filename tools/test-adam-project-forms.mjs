#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GearcolecoTestCore,
  GEARCOLECO_ADAM_MEDIA,
  GEARCOLECO_ADAM_SLOT
} from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await import("./build-adam-project-forms.mjs");
const output = path.join(root, "build", "adam-project-forms");
const firmware = path.join(root, "studio", "bios", "adam");
const cases = [
  ["adam-eos-native-starter.dsk", GEARCOLECO_ADAM_SLOT.DISK_1, GEARCOLECO_ADAM_MEDIA.DISK],
  ["adam-eos-native-starter.ddp", GEARCOLECO_ADAM_SLOT.DATA_PACK_1, GEARCOLECO_ADAM_MEDIA.DATA_PACK]
];

for (const [name, slot, type] of cases) {
  const core = await GearcolecoTestCore.create({ seed: 0xa0e5 });
  try {
    core.loadAdamFirmware({
      os7: fs.readFileSync(path.join(firmware, "OS7.ROM")),
      eos: fs.readFileSync(path.join(firmware, "EOS.ROM")),
      smartwriter: fs.readFileSync(path.join(firmware, "WP.ROM"))
    });
    core.startAdam();
    core.loadAdamMedia(fs.readFileSync(path.join(output, name)), { slot, type, writeProtected: true });
    core.reset();
    for (let frame = 0; frame < 600 && core.readRam(0x2100, 1)[0] !== 0xa5; frame++) core.runFrame();
    assert.equal(core.readRam(0x2100, 1)[0], 0xa5, `${name} did not execute its EOS boot block`);
    assert.equal(core.readRam(0x2101, 1)[0], 5, `${name} did not finish its internal assertions`);
    assert.equal(String.fromCharCode(...core.readVram(0x18ca, 10)), "AMY STUDIO", `${name} title is absent`);
    assert.equal(String.fromCharCode(...core.readVram(0x1927, 18)), "NATIVE EOS STARTER", `${name} subtitle is absent`);
    assert.equal(String.fromCharCode(...core.readVram(0x19e5, 20)), "SELF TESTS: 5 PASSED", `${name} self-test status is absent`);
    assert.deepEqual(core.getAdamPrinterData(), Uint8Array.from([0x41, 0x4d, 0x59, 0x0d]), `${name} EOS printer output differs`);
    console.log(`PASS ${name}: native EOS boot, VRAM, RAM signature, and printer output`);
  } finally {
    core.destroy();
  }
}
