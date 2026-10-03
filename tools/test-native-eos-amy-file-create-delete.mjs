#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildAdamBootDataPack, buildAdamBootDisk } from "../studio/core/adamDiskImage.js";
import { GearcolecoTestCore, GEARCOLECO_ADAM_MEDIA, GEARCOLECO_ADAM_SLOT } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(import.meta.dirname, "..");
const expected = Uint8Array.from([0x43, 0x52, 0x45, 0x41, 0x54, 0x45, 0x44, 0x20, 0x42, 0x59, 0x20, 0x41, 0x4D, 0x59, 0x21, 0x20]);
const firmwareRoot = path.join(root, "studio", "bios", "adam");
const firmware = {
  os7: fs.readFileSync(path.join(firmwareRoot, "OS7.ROM")),
  eos: fs.readFileSync(path.join(firmwareRoot, "EOS.ROM")),
  smartwriter: fs.readFileSync(path.join(firmwareRoot, "WP.ROM"))
};

for (const fixture of [
  { name: "DSK", suffix: "dsk", build: buildAdamBootDisk, slot: GEARCOLECO_ADAM_SLOT.DISK_1, type: GEARCOLECO_ADAM_MEDIA.DISK },
  { name: "DDP", suffix: "ddp", build: buildAdamBootDataPack, slot: GEARCOLECO_ADAM_SLOT.DATA_PACK_1, type: GEARCOLECO_ADAM_MEDIA.DATA_PACK }
]) {
  const program = fs.readFileSync(path.join(root, "build", `adam-native-eos-file-create-delete-${fixture.suffix}.bin`));
  const asm = fs.readFileSync(path.join(root, "build", `adam-native-eos-file-create-delete-${fixture.suffix}.asm`), "utf8");
  assert.match(asm, /call \$FCC9[\s\S]*call \$FCD5[\s\S]*call \$FCD2[\s\S]*call \$FCE1/i);
  const built = fixture.build({ boot: program, files: [], volume: "AMY CREATE" });
  const core = await GearcolecoTestCore.create({ seed: 0x43524541 });
  try {
    core.loadAdamFirmware(firmware);
    core.startAdam();
    core.loadAdamMedia(built.media, { slot: fixture.slot, type: fixture.type, writeProtected: false });
    core.reset();
    for (let frame = 0; frame < 480; frame++) core.runFrame();
    assert.deepEqual([...core.readRam(0x2100, 5)], [0, 0, 0, 0, 1], `${fixture.name} create/write/read/delete status differs`);
    assert.deepEqual([...core.readRam(0x2115, expected.length)], [...expected], `${fixture.name} created-file readback differs`);
  } finally {
    core.destroy();
  }
}

console.log("Native Amy EOS file lifecycle: PASS (create/write/read/delete verified from DSK/DDP)");
