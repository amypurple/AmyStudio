#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  GearcolecoTestCore,
  GEARCOLECO_ADAM_BOOT,
  GEARCOLECO_ADAM_MEDIA,
  GEARCOLECO_ADAM_SLOT,
  GEARCOLECO_MACHINE,
  GEARCOLECO_VIDEO_CHIP
} from "../studio/core/gearcolecoTestCore.js";

assert.deepEqual(GEARCOLECO_MACHINE, { AUTO: 0, COLECOVISION: 1, ADAM: 2 });
assert.deepEqual(GEARCOLECO_ADAM_BOOT, { COMPUTER: 0, CARTRIDGE: 1 });
assert.deepEqual(GEARCOLECO_ADAM_MEDIA, { DATA_PACK: 1, DISK: 2 });
assert.deepEqual(GEARCOLECO_ADAM_SLOT, { DISK_1: 0, DISK_2: 1, DATA_PACK_1: 2, DATA_PACK_2: 3 });

const core = await GearcolecoTestCore.create({ seed: 0x170 });
try {
  for (const method of ["loadAdamFirmware", "startAdam", "getMachine", "loadAdamMedia",
    "ejectAdamMedia", "setAdamKey", "setVideoChip", "getVideoChip"]) {
    assert.equal(typeof core[method], "function", `${method} is unavailable`);
  }

  core.setVideoChip(GEARCOLECO_VIDEO_CHIP.F18A);
  assert.ok(Object.values(GEARCOLECO_VIDEO_CHIP).includes(core.getVideoChip()));
  core.setVideoChip("tms9918a");
  assert.equal(core.getVideoChip(), GEARCOLECO_VIDEO_CHIP.TMS9918A);
  assert.throws(() => core.setVideoChip("unknown"), /Unknown video chip/);
  console.log("GearColeco 1.7 platform capabilities: PASS");
} finally {
  core.destroy();
}
