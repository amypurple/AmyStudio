#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildMegaCartLinkMap, resolveMegaCartExport, resolveMegaCartSymbol } from "../studio/core/megaCartLinkMap.js";
import { MEGACART_SWITCHABLE_BYTES } from "../studio/core/megaCartImage.js";

const linkMap = buildMegaCartLinkMap({
  sizeKb: 128,
  fixedBank: { bytes: new Uint8Array(0x120), symbols: [{ name: "Start", address: 0x8000 }] },
  switchableBanks: [
    {
      logicalBank: 1,
      bytes: new Uint8Array(12),
      symbols: [{ name: "Shared", address: 0xC000 }, { name: "AMY_UPROC_Draw", address: 0xC004 }],
      exports: ["Draw"],
      sourceMap: { version: 1, entries: [{ sourceLine: 3, addresses: [0xC000, 0xC005], optimizedAway: false }] }
    },
    { logicalBank: 2, bytes: new Uint8Array(MEGACART_SWITCHABLE_BYTES), symbols: [{ name: "Shared", address: 0xC000 }] }
  ]
});

assert.equal(linkMap.sections[0].fileOffset, 7 * 0x4000);
assert.equal(linkMap.sections[1].fileOffset, 0);
assert.equal(linkMap.sections[2].fileOffset, 0x4000);
assert.equal(linkMap.sections[1].logicalStart, 0xC000);
assert.equal(linkMap.sections[2].logicalStart, 0xC000);
assert.equal(linkMap.sections[2].free, 0);
assert.deepEqual(linkMap.sections[1].sourceMap.entries[0].qualifiedAddresses, [
  { bank: 1, address: 0xC000, fileOffset: 0 },
  { bank: 1, address: 0xC005, fileOffset: 5 }
]);
assert.equal(resolveMegaCartSymbol(linkMap, "fixed:Start").address, 0x8000);
assert.equal(resolveMegaCartSymbol(linkMap, "Shared", 1).qualifiedName, "bank:1:Shared");
assert.equal(resolveMegaCartSymbol(linkMap, "bank:2:Shared").bank, 2);
assert.throws(() => resolveMegaCartSymbol(linkMap, "Shared"), /Ambiguous/);
assert.deepEqual(resolveMegaCartExport(linkMap, "Draw"), {
  name: "Draw", symbol: "AMY_UPROC_Draw", address: 0xC004, bank: 1, qualifiedName: "bank:1:Draw"
});
assert.equal(resolveMegaCartExport(linkMap, "bank:1:Draw").address, 0xC004);
assert.throws(() => buildMegaCartLinkMap({
  sizeKb: 128,
  fixedBank: new Uint8Array(2),
  switchableBanks: [{ logicalBank: 1, bytes: new Uint8Array(2), symbols: [
    { name: "Same", address: 0xC000 }, { name: "same", address: 0xC001 }
  ] }]
}), /Duplicate symbol/);
assert.throws(() => buildMegaCartLinkMap({
  sizeKb: 128,
  fixedBank: new Uint8Array(2),
  switchableBanks: [{ logicalBank: 1, bytes: new Uint8Array(MEGACART_SWITCHABLE_BYTES + 1) }]
}), /overflow/);
assert.throws(() => buildMegaCartLinkMap({
  sizeKb: 128,
  fixedBank: new Uint8Array(2),
  switchableBanks: [{ logicalBank: 1, bytes: new Uint8Array(2), symbols: [{ name: "Mapper", address: 0xFFC0 }] }]
}), /outside/);
assert.throws(() => buildMegaCartLinkMap({
  sizeKb: 128,
  fixedBank: new Uint8Array(2),
  switchableBanks: [{ logicalBank: 1, bytes: new Uint8Array(2), symbols: [], exports: ["Missing"] }]
}), /does not match/);
assert.throws(() => buildMegaCartLinkMap({
  sizeKb: 128,
  fixedBank: new Uint8Array(2),
  switchableBanks: [
    { logicalBank: 1, bytes: new Uint8Array(2), symbols: [{ name: "One", address: 0xC000 }], exports: ["One"] },
    { logicalBank: 2, bytes: new Uint8Array(2), symbols: [{ name: "One", address: 0xC000 }], exports: ["One"] }
  ]
}), /Duplicate MegaCart export/);

console.log("MegaCart link map: PASS (bank-qualified symbols and exports, physical offsets, exact capacity, fail-closed diagnostics)");
