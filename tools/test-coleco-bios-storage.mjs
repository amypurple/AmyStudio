import assert from "node:assert/strict";
import {
  COLECO_BIOS_SIZE,
  loadColecoBiosFromBrowser,
  saveColecoBiosToBrowser
} from "../studio/core/colecoBiosStorage.js";

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key)
};
const bios = Uint8Array.from({ length: COLECO_BIOS_SIZE }, (_, index) => index & 0xff);
saveColecoBiosToBrowser(bios, "my-os7.rom", storage);
const restored = loadColecoBiosFromBrowser(storage);
assert.equal(restored.name, "my-os7.rom");
assert.deepEqual(restored.bytes, bios);
assert.throws(() => saveColecoBiosToBrowser(new Uint8Array(16), "bad.rom", storage), /8192 bytes/);
values.set("amy_colecovision_bios_v1", "not json");
assert.equal(loadColecoBiosFromBrowser(storage), null);
console.log("Coleco BIOS browser storage PASS");