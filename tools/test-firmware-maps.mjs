#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  EOS_FIRMWARE_STATE,
  EOS_PUBLIC_VECTORS,
  OS7_EOS_SERVICE_RELATIONS,
  OS7_FIRMWARE_STATE,
  OS7_PUBLIC_VECTORS
} from "../studio/core/firmwareMaps.js";
import { getRamLayout } from "../studio/ramLayouts.js";

const bundledFirmwareRoot = path.resolve("studio/bios");
const historicalFirmwareRoot = path.resolve("2005 mes documents/daniel bienvenu (2)/coleco4k/coleco");
const firmwareRoot = fs.existsSync(path.join(bundledFirmwareRoot, "EOS.ROM"))
  ? bundledFirmwareRoot
  : historicalFirmwareRoot;
const eos = fs.readFileSync(path.join(firmwareRoot, "EOS.ROM"));
const os7 = fs.readFileSync(path.join(firmwareRoot, "OS7.ROM"));

for (const [name, address] of Object.entries(EOS_PUBLIC_VECTORS)) {
  const offset = address - 0xE000;
  assert.ok(offset >= 0 && offset + 2 < eos.length, `EOS ${name} is outside EOS.ROM`);
  assert.equal(eos[offset], 0xC3, `EOS ${name} at $${hex(address)} is not a JP vector`);
  const target = eos.readUInt16LE(offset + 1);
  assert.ok(target >= 0xE000 && target <= 0xFFFF, `EOS ${name} targets $${hex(target)} outside EOS firmware`);
}

for (const [os7Name, eosName] of OS7_EOS_SERVICE_RELATIONS) {
  assert.ok(OS7_PUBLIC_VECTORS[os7Name] != null, `unknown OS-7 relation ${os7Name}`);
  assert.ok(EOS_PUBLIC_VECTORS[eosName] != null, `unknown EOS relation ${eosName}`);
}

for (const [name, address] of Object.entries(OS7_PUBLIC_VECTORS)) {
  assert.ok(address >= 0 && address < os7.length, `OS-7 ${name} is outside OS7.ROM`);
}

const native = getRamLayout("adam-eos-application");
const legacyAlias = getRamLayout("colecovision-cartridge");
const megaCartAlias = getRamLayout("colecovision-megacart");
for (const layout of [legacyAlias, megaCartAlias]) {
  assert.equal(layout.userRamEndExclusive, 0x73B8);
  assert.equal(layout.stackTop, 0x73B9);
  assert.equal(layout.recommendedStackReserveBytes, 64);
}
assert.equal(native.userRamEndExclusive, 0x2F00, "native Amy variables must stop before the native stack page");
assert.ok(native.reserved.some((range) => range.start === 0x2F00 && range.endExclusive === 0x3000), "native stack page is not reserved");
for (const range of stateRanges(EOS_FIRMWARE_STATE)) {
  assert.ok(!overlaps(native.userRamStart, native.userRamEndExclusive - 1, range.start, range.end), `native Amy RAM overlaps EOS ${range.name}`);
}
assert.equal(OS7_FIRMWARE_STATE.VDP_R1_SHADOW, 0x73C4);
assert.equal(EOS_FIRMWARE_STATE.VDP_R1_SHADOW, 0xFD62);
assert.equal(EOS_PUBLIC_VECTORS.RESET_ADAMNET, 0xFC60);
assert.equal(EOS_PUBLIC_VECTORS.PRINTER_WRITE_STRING, 0xFC63);
assert.equal(EOS_PUBLIC_VECTORS.READ_BLOCK_DEVICE, 0xFC69);
assert.equal(EOS_PUBLIC_VECTORS.KEYBOARD_COMPLETION, 0xFC6F);
assert.equal(EOS_PUBLIC_VECTORS.PRINTER_COMPLETION, 0xFC72);
assert.equal(EOS_PUBLIC_VECTORS.DEVICE_COMPLETION, 0xFC75);
assert.equal(EOS_PUBLIC_VECTORS.TAPE_COMPLETION, 0xFC78);
assert.equal(EOS_PUBLIC_VECTORS.RELOCATE_PCB, 0xFC7B);
assert.equal(EOS_PUBLIC_VECTORS.INIT_TAPE_DIRECTORY, 0xFCBD);
assert.equal(EOS_PUBLIC_VECTORS.RESET_FILE, 0xFCC6);
assert.equal(EOS_PUBLIC_VECTORS.SET_DATE, 0xFCD8);
assert.equal(EOS_PUBLIC_VECTORS.GO_TO_WORD_PROCESSOR, 0xFCE7);

console.log(`Firmware maps: PASS (${Object.keys(OS7_PUBLIC_VECTORS).length} OS-7 entries, ${Object.keys(EOS_PUBLIC_VECTORS).length} EOS vectors, ${OS7_EOS_SERVICE_RELATIONS.length} mapped relations)`);

function stateRanges(state) {
  const ranges = [];
  for (const [name, start] of Object.entries(state)) {
    if (!name.endsWith("_START")) continue;
    const endName = `${name.slice(0, -6)}_END`;
    ranges.push({ name: name.slice(0, -6), start, end: state[endName] ?? start });
  }
  return ranges;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

function hex(value) {
  return value.toString(16).toUpperCase().padStart(4, "0");
}
