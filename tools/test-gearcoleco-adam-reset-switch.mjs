#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  GearcolecoTestCore,
  GEARCOLECO_ADAM_BOOT,
  GEARCOLECO_MACHINE
} from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const firmwareRoot = path.join(root, "studio", "bios", "adam");
const firmware = {
  os7: fs.readFileSync(path.join(firmwareRoot, "OS7.ROM")),
  eos: fs.readFileSync(path.join(firmwareRoot, "EOS.ROM")),
  smartwriter: fs.readFileSync(path.join(firmwareRoot, "WP.ROM"))
};

const cartridge = new Uint8Array(32 * 1024).fill(0xFF);
cartridge.set([
  0x55, 0xAA,             // cartridge signature
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x70,             // RAM top
  0x00, 0x00,
  0x26, 0x80,             // start at $8026
  ...Array(7).fill([0xC9, 0x00, 0x00]).flat(),
  0xC3, 0x24, 0x80,       // NMI vector
  0xED, 0x45,             // $8024: RETN
  0xF3,                   // $8026: DI
  0x3E, 0x11,             // LD A,$11
  0x32, 0x00, 0x60,       // LD ($6000),A
  0x3E, 0x22,             // LD A,$22
  0x32, 0x00, 0x64,       // LD ($6400),A
  0xC3, 0x31, 0x80        // JP $8031
]);

function assertAdamCartridgeRamIsNotMirrored(core) {
  core.runFrame();
  assert.equal(core.readRam(0x6000, 1)[0], 0x11, "ADAM cartridge RAM at $6000 must retain its own byte");
  assert.equal(core.readRam(0x6400, 1)[0], 0x22, "ADAM cartridge RAM at $6400 must not mirror $6000");
}

const core = await GearcolecoTestCore.create({ seed: 0xAD40 });
try {
  core.loadAdamFirmware(firmware);
  core.loadRom(cartridge);
  core.startAdam({ cartridge: true });

  assert.equal(core.getMachine(), GEARCOLECO_MACHINE.ADAM, "cartridge boot must retain ADAM hardware");
  assert.equal(core.getAdamBootMode(), GEARCOLECO_ADAM_BOOT.CARTRIDGE);
  assert.equal(core.getAdamMioc(), 0x0F, "ColecoVision reset must select the ADAM cartridge map");
  assertAdamCartridgeRamIsNotMirrored(core);

  core.resetAdam();
  assert.equal(core.getMachine(), GEARCOLECO_MACHINE.ADAM);
  assert.equal(core.getAdamBootMode(), GEARCOLECO_ADAM_BOOT.COMPUTER);
  assert.equal(core.getAdamMioc(), 0x00, "ADAM reset must select the EOS computer map");

  core.resetAdam({ cartridge: true });
  assert.equal(core.getMachine(), GEARCOLECO_MACHINE.ADAM);
  assert.equal(core.getAdamBootMode(), GEARCOLECO_ADAM_BOOT.CARTRIDGE);
  assert.equal(core.getAdamMioc(), 0x0F, "ColecoVision reset must restore the cartridge map");
  assertAdamCartridgeRamIsNotMirrored(core);
} finally {
  core.destroy();
}

console.log("GearColeco ADAM dual reset switch: PASS (EOS $00 <-> OS7 cartridge $0F)");
