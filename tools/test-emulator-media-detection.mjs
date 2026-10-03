#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { detectEmulatorMedia, EMULATOR_MEDIA_KIND, isKnownEmulatorMediaName } from "../studio/core/emulatorMediaDetection.js";

const bytes = (size, prefix = []) => Uint8Array.from({ length: size }, (_, index) => prefix[index] || 0);

assert.deepEqual(detectEmulatorMedia("game.rom", bytes(32768, [0xAA, 0x55])), { kind: EMULATOR_MEDIA_KIND.ROM, detectedBy: "extension" });
assert.deepEqual(detectEmulatorMedia("game.col", bytes(163840, [0x55, 0xAA])), { kind: EMULATOR_MEDIA_KIND.ROM, detectedBy: "extension" });
assert.deepEqual(detectEmulatorMedia("software.dsk", 163840), { kind: EMULATOR_MEDIA_KIND.ADAM_DISK, detectedBy: "geometry" });
assert.deepEqual(detectEmulatorMedia("software.ddp", 262144), { kind: EMULATOR_MEDIA_KIND.ADAM_DATA_PACK, detectedBy: "geometry" });
assert.deepEqual(detectEmulatorMedia("unknown.bin", 163840), { kind: EMULATOR_MEDIA_KIND.ADAM_DISK, detectedBy: "geometry" });
assert.deepEqual(detectEmulatorMedia("unknown.bin", 262144), { kind: EMULATOR_MEDIA_KIND.ADAM_DATA_PACK, detectedBy: "geometry" });
assert.deepEqual(detectEmulatorMedia("megacart.bin", bytes(262144, [0xAA, 0x55])), { kind: EMULATOR_MEDIA_KIND.ROM, detectedBy: "signature" });
assert.deepEqual(detectEmulatorMedia("megacart.bin", bytes(262144, [0x55, 0xAA])), { kind: EMULATOR_MEDIA_KIND.ROM, detectedBy: "signature" });
assert.deepEqual(detectEmulatorMedia("mistyped.ddp", 163840), { kind: EMULATOR_MEDIA_KIND.ADAM_DISK, detectedBy: "geometry" });
assert.equal(detectEmulatorMedia("archive.zip", 163840), null);
assert.equal(detectEmulatorMedia("archive.gz", 262144), null);
assert.equal(detectEmulatorMedia("archive.bin", bytes(262144, [0x50, 0x4B, 0x03, 0x04])), null);
assert.equal(detectEmulatorMedia("archive.bin", bytes(262144, [0x1F, 0x8B])), null);
assert.equal(detectEmulatorMedia("unknown.bin", 1024), null);
assert.equal(isKnownEmulatorMediaName("SOFTWARE.DDP"), true);
assert.equal(isKnownEmulatorMediaName("software.bin"), false);

const recorderUi = fs.readFileSync("studio/core/romTestRecorderUi.js", "utf8");
assert.match(recorderUi, /detectEmulatorMedia\(file\?\.name, bytes\)/,
  "ROM TEST & DEBUG does not classify dropped media by extension, signature, and geometry");
assert.match(recorderUi, /GEARCOLECO_ADAM_SLOT\.DATA_PACK_1\s*:\s*GEARCOLECO_ADAM_SLOT\.DISK_1/,
  "ROM TEST & DEBUG does not mount DDP and DSK in their distinct ADAM slots");
assert.match(recorderUi, /files\.length === 1 \? files\[0\]/,
  "a single extensionless ADAM image is not forwarded to geometry detection");

console.log("Emulator media detection: PASS (ROM/MegaCart signatures, DSK/DDP geometry, compressed rejection)");
