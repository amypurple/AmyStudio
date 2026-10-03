#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildNativeEosPreamble } from "../studio/core/project.js";
import { buildAdamBootDataPack, buildAdamBootDisk } from "../studio/core/adamDiskImage.js";
import { GearcolecoTestCore, GEARCOLECO_ADAM_MEDIA, GEARCOLECO_ADAM_SLOT } from "../studio/core/gearcolecoTestCore.js";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = [
  ...buildNativeEosPreamble(),
  "Start:",
  "        di",
  "        ld sp,$2FF0",
  "        ld hl,VRAM_NAME",
  "        ld a,2",
  "        call INIT_TABLE",
  "        ld bc,$0180",
  "        call WRITE_REGISTER",
  "        call LOAD_ASCII",
  "        ld hl,VRAM_NAME",
  "        ld de,768",
  "        ld a,$20",
  "        call FILL_VRAM",
  "        ld hl,Message",
  "        ld de,$1929",
  "        ld bc,18",
  "        call WRITE_VRAM",
  "        ld bc,$01C0",
  "        call WRITE_REGISTER",
  "Forever:",
  "        halt",
  "        jp Forever",
  "Message: db \"NATIVE AMY EOS OK \""
].join("\n");

const assembled = await assembleAmysCVAssembly({ "native-eos.asm": source }, "native-eos.asm", {
  outputFilename: "native-eos.bin",
  outputMode: "binary",
  optimizerEnabled: false,
  targetPlatform: "raw"
});
assert.equal(assembled.ok, true, assembled.log);
const boot = assembled.binary;
assert.ok(boot.length <= 1024, `native EOS boot is ${boot.length} bytes`);

const firmwareRoot = path.join(root, "studio", "bios", "adam");
const firmware = {
  os7: fs.readFileSync(path.join(firmwareRoot, "OS7.ROM")),
  eos: fs.readFileSync(path.join(firmwareRoot, "EOS.ROM")),
  smartwriter: fs.readFileSync(path.join(firmwareRoot, "WP.ROM"))
};

for (const fixture of [
  { name: "DSK", built: buildAdamBootDisk({ boot, volume: "AMY NATIVE" }), slot: GEARCOLECO_ADAM_SLOT.DISK_1, type: GEARCOLECO_ADAM_MEDIA.DISK },
  { name: "DDP", built: buildAdamBootDataPack({ boot, volume: "AMY NATIVE" }), slot: GEARCOLECO_ADAM_SLOT.DATA_PACK_1, type: GEARCOLECO_ADAM_MEDIA.DATA_PACK }
]) {
  const core = await GearcolecoTestCore.create({ seed: 0x454f53 });
  try {
    core.loadAdamFirmware(firmware);
    core.startAdam();
    core.loadAdamMedia(fixture.built.media, { slot: fixture.slot, type: fixture.type, writeProtected: true });
    core.reset();
    for (let frame = 0; frame < 240; frame++) core.runFrame();
    assert.equal(new TextDecoder().decode(core.readVram(0x1929, 18)), "NATIVE AMY EOS OK ", `${fixture.name} screen text`);
  } finally {
    core.destroy();
  }
}

console.log(`Native EOS generator: PASS (${boot.length} byte boot, DSK and DDP runtime verified)`);
