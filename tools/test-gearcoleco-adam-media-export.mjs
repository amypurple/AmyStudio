import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GearcolecoTestCore, GEARCOLECO_ADAM_MEDIA, GEARCOLECO_ADAM_SLOT } from "../studio/core/gearcolecoTestCore.js";

const core = await GearcolecoTestCore.create({ seed: 0x4D454449 });
try {
  const firmwareRoot = path.resolve(import.meta.dirname, "../studio/bios/adam");
  core.loadAdamFirmware({
    os7: fs.readFileSync(path.join(firmwareRoot, "OS7.ROM")),
    eos: fs.readFileSync(path.join(firmwareRoot, "EOS.ROM")),
    smartwriter: fs.readFileSync(path.join(firmwareRoot, "WP.ROM"))
  });
  core.startAdam();
  const disk = new Uint8Array(160 * 1024);
  for (let index = 0; index < disk.length; index += 1) disk[index] = (index * 29 + 7) & 0xFF;
  core.loadAdamMedia(disk, {
    slot: GEARCOLECO_ADAM_SLOT.DISK_1,
    type: GEARCOLECO_ADAM_MEDIA.DISK,
    writeProtected: false
  });
  assert.deepEqual(core.readAdamMedia(GEARCOLECO_ADAM_SLOT.DISK_1), disk, "exported ADAM disk differs from mounted media");
  core.ejectAdamMedia(GEARCOLECO_ADAM_SLOT.DISK_1);
  assert.throws(() => core.readAdamMedia(GEARCOLECO_ADAM_SLOT.DISK_1), /No ADAM media/, "ejected media remained exportable");
  console.log("GearColeco ADAM media export: PASS (160 KiB DSK)");
} finally {
  core.destroy();
}
