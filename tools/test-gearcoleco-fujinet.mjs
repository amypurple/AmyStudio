import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildFujiNetAppBankImage } from "../studio/core/fujiNetImage.js";
import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";

const bios = readFileSync(new URL("../studio/bios/colecovision.rom", import.meta.url));
const window = new Uint8Array(0x7800);
window[0] = 0x55; window[1] = 0xAA;
const image = buildFujiNetAppBankImage(window, [Uint8Array.of(1, 2, 3)]);

const core = await GearcolecoTestCore.create({ seed: 0x46554A49 });
try {
  core.loadBios(bios);
  core.setFujiNetEnabled(true);
  core.loadRom(image);
  assert.equal(core.getFujiNetEnabled(), true);
  assert.equal(core.getCartridgeType(), 4, "FUJI image must select the FujiNet mapper");
  core.setFujiNetEnabled(false);
  core.loadRom(image);
  assert.equal(core.getCartridgeType(), 0, "disabled FujiNet must fall back to a standard cartridge window");
} finally {
  core.destroy();
}

console.log("GearColeco FujiNet test-device toggle passed.");
