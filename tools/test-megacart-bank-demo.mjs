#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await import("./build-megacart-bank-demo.mjs");
const firmware = process.env.AMY_COLECO_BIOS || path.join(root, "studio", "bios", "colecovision.rom");
for (const sizeKb of [64, 128]) {
 const rom = fs.readFileSync(path.join(root, "build", "megacart-bank-demo", `megacart-bank-demo-${sizeKb}k.rom`));
 const core = await GearcolecoTestCore.create({ seed: 0x4d43 + sizeKb });
 try {
  core.loadBios(fs.readFileSync(firmware));
  core.loadRom(rom);
  core.reset();
  for (let frame = 0; frame < 180; frame++) core.runFrame();
  assert.equal(core.readRam(0x7000, 1)[0], 0x10, "bank 1 code path did not execute");
  assert.equal(core.readRam(0x7001, 1)[0], 0x21, "bank 2 code path did not execute");
  assert.equal(String.fromCharCode(...core.readVram(0x1928, 16)), "DATA FROM BANK 1");
  assert.equal(String.fromCharCode(...core.readVram(0x1968, 16)), "DATA FROM BANK 2");
  assert.equal(core.getRomBank(), 1, "logical bank 2 should leave physical MegaCart bank 1 selected");
  assert.equal(core.isMegaCart(), true, "runtime must identify the MegaCart mapper explicitly");
  console.log(`MegaCart ${sizeKb}K runtime PASS: fixed code selected and read two independent 16 KB banks.`);
 } finally {
   core.destroy();
 }
}
