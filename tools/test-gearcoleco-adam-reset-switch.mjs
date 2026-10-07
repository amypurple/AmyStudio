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

// A valid cartridge is sufficient here: the test observes the physical ADAM
// boot switch and memory mapper before executing cartridge application code.
const cartridge = new Uint8Array(32 * 1024).fill(0xFF);
cartridge[0] = 0xAA;
cartridge[1] = 0x55;

const core = await GearcolecoTestCore.create({ seed: 0xAD40 });
try {
  core.loadAdamFirmware(firmware);
  core.loadRom(cartridge);
  core.startAdam({ cartridge: true });

  assert.equal(core.getMachine(), GEARCOLECO_MACHINE.ADAM, "cartridge boot must retain ADAM hardware");
  assert.equal(core.getAdamBootMode(), GEARCOLECO_ADAM_BOOT.CARTRIDGE);
  assert.equal(core.getAdamMioc(), 0x0F, "ColecoVision reset must select the ADAM cartridge map");

  core.resetAdam();
  assert.equal(core.getMachine(), GEARCOLECO_MACHINE.ADAM);
  assert.equal(core.getAdamBootMode(), GEARCOLECO_ADAM_BOOT.COMPUTER);
  assert.equal(core.getAdamMioc(), 0x00, "ADAM reset must select the EOS computer map");

  core.resetAdam({ cartridge: true });
  assert.equal(core.getMachine(), GEARCOLECO_MACHINE.ADAM);
  assert.equal(core.getAdamBootMode(), GEARCOLECO_ADAM_BOOT.CARTRIDGE);
  assert.equal(core.getAdamMioc(), 0x0F, "ColecoVision reset must restore the cartridge map");
} finally {
  core.destroy();
}

console.log("GearColeco ADAM dual reset switch: PASS (EOS $00 <-> OS7 cartridge $0F)");
