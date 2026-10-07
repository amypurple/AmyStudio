#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildMegaCartImage,
  getMegaCartLayout,
  getMegaCartSelectAddress,
  MEGACART_BANK_BYTES,
  MEGACART_SWITCHABLE_BYTES
} from "../studio/core/megaCartImage.js";

const fixed = new Uint8Array([0xAA, 0x55, 0x34, 0x12]);
const bank0 = new Uint8Array([0x10, 0x20, 0x30]);
const bank2 = new Uint8Array([0x42, 0x43]);
const { image, layout } = buildMegaCartImage({
  sizeKb: 128,
  fixedBank: fixed,
  switchableBanks: [{ bank: 0, bytes: bank0 }, { bank: 2, bytes: bank2 }]
});

assert.equal(image.length, 128 * 1024);
assert.equal(layout.bankCount, 8);
assert.equal(layout.fixedBank, 7);
assert.deepEqual(image.slice(0, bank0.length), bank0);
assert.deepEqual(image.slice(2 * MEGACART_BANK_BYTES, 2 * MEGACART_BANK_BYTES + bank2.length), bank2);
assert.deepEqual(image.slice(7 * MEGACART_BANK_BYTES, 7 * MEGACART_BANK_BYTES + fixed.length), fixed);
assert.ok(image.slice(MEGACART_SWITCHABLE_BYTES, MEGACART_BANK_BYTES).every((byte) => byte === 0xFF));
assert.equal(image[MEGACART_SWITCHABLE_BYTES - 1], 0xF8);
assert.equal(image[2 * MEGACART_BANK_BYTES + MEGACART_SWITCHABLE_BYTES - 1], 0xFA);
assert.equal(getMegaCartSelectAddress(2, 128), 0xFFC2);
assert.equal(getMegaCartLayout(64).bankCount, 4);
assert.equal(getMegaCartLayout(1024).bankCount, 64);

assert.throws(() => buildMegaCartImage({
  sizeKb: 128,
  fixedBank: fixed,
  switchableBanks: [{ bank: 1, bytes: new Uint8Array(MEGACART_SWITCHABLE_BYTES + 1) }]
}), /overflow/);
assert.throws(() => buildMegaCartImage({
  sizeKb: 128,
  fixedBank: fixed,
  switchableBanks: [{ bank: 0, bytes: new Uint8Array([0xAA, 0x55]) }]
}), /Activision/);
assert.throws(() => buildMegaCartImage({ sizeKb: 128, fixedBank: new Uint8Array([0, 0]) }), /header/);
assert.throws(() => getMegaCartSelectAddress(8, 128), /between 0 and 7/);

console.log("MegaCart image foundation: PASS (64-1024 KB layouts, mapper footer, overflow diagnostics)");
