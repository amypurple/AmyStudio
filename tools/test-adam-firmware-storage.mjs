import assert from "node:assert/strict";
import {
  ADAM_FIRMWARE_STORAGE_KEY,
  clearAdamFirmwareFromBrowser,
  loadAdamFirmwareFromBrowser,
  saveAdamFirmwareToBrowser
} from "../studio/core/adamFirmwareStorage.js";

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key)
};
const firmware = {
  os7: new Uint8Array(8192).fill(0x07),
  eos: new Uint8Array(8192).fill(0xe0),
  smartwriter: new Uint8Array(32768).fill(0x57)
};
saveAdamFirmwareToBrowser(firmware, { os7: "OS7.ROM", eos: "EOS.ROM", smartwriter: "WP.ROM" }, storage);
const restored = loadAdamFirmwareFromBrowser(storage);
assert.deepEqual(restored.os7, firmware.os7);
assert.deepEqual(restored.eos, firmware.eos);
assert.deepEqual(restored.smartwriter, firmware.smartwriter);
assert.equal(restored.names.smartwriter, "WP.ROM");
assert.throws(() => saveAdamFirmwareToBrowser({ ...firmware, eos: new Uint8Array(1) }, {}, storage), /8192 bytes/);
clearAdamFirmwareFromBrowser(storage);
assert.equal(values.has(ADAM_FIRMWARE_STORAGE_KEY), false);
values.set(ADAM_FIRMWARE_STORAGE_KEY, "bad json");
assert.equal(loadAdamFirmwareFromBrowser(storage), null);
console.log("ADAM firmware browser storage PASS");
