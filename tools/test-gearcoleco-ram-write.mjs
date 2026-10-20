#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const core = await GearcolecoTestCore.create({ seed: 0x52414D57 });
try {
  core.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
  core.loadRom(Uint8Array.from([0xAA, 0x55, ...new Uint8Array(0x7FFE)]), {
    region: GEARCOLECO_TEST_REGION.NTSC,
  });

  core.writeRam(0x7000, [0x12, 0x34, 0x56]);
  assert.deepEqual([...core.readRam(0x7000, 3)], [0x12, 0x34, 0x56]);

  core.writeRam(0x73B6, Uint8Array.from([0xA5, 0x5A]));
  assert.deepEqual([...core.readRam(0x73B6, 2)], [0xA5, 0x5A]);

  assert.throws(
    () => core.writeRam(0xFFFE, [1, 2, 3]),
    /Could not write 3 RAM bytes at \$fffe/i,
    "writes that cross the 16-bit address boundary must fail closed",
  );
} finally {
  core.destroy();
}

console.log("GearColeco RAM-write test API: PASS (round-trip and boundary rejection).");
