#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildAdamBootDataPack, buildAdamBootDisk } from "../studio/core/adamDiskImage.js";
import { GearcolecoTestCore, GEARCOLECO_ADAM_MEDIA, GEARCOLECO_ADAM_SLOT } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(import.meta.dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-eos-serial-"));
const firmwareRoot = path.join(root, "studio", "bios", "adam");
const firmware = {
  os7: fs.readFileSync(path.join(firmwareRoot, "OS7.ROM")),
  eos: fs.readFileSync(path.join(firmwareRoot, "EOS.ROM")),
  smartwriter: fs.readFileSync(path.join(firmwareRoot, "WP.ROM"))
};
const profiles = [
  { name: "adamlink", hardware: "adamlink", source: "adam-native-eos-serial-smoke.alexis", expected: [1, 1, 1, 0x41, 1, 1] },
  { name: "eve", hardware: "eve-serial", source: "adam-native-eos-serial-smoke.alexis", expected: [1, 1, 1, 0x41, 1, 1] },
  { name: "micro", hardware: "micro-serial", source: "adam-native-eos-serial-micro-smoke.alexis", expected: [1, 1, 1, 0x41, 1, 1] }
];

const fixtures = profiles.map((profile) => ({
  ...profile,
  media: buildAdamBootDisk({ boot: compile(profile), files: [], volume: "AMY SERIAL" }).media
}));
fixtures.push({
  ...profiles[0],
  name: "adamlink absent",
  emulatorProfile: "none",
  expected: [0, 0, 0, 0, 0, 1],
  expectedTransmit: [],
  media: buildAdamBootDisk({ boot: compile(profiles[0]), files: [], volume: "AMY SERIAL" }).media
});
fixtures.push({
  ...profiles[0],
  name: "adamlink DDP",
  media: buildAdamBootDataPack({ boot: compile(profiles[0]), files: [], volume: "AMY SERIAL" }).media,
  slot: GEARCOLECO_ADAM_SLOT.DATA_PACK_1,
  type: GEARCOLECO_ADAM_MEDIA.DATA_PACK
});
const hybridProgram = compile(profiles[0], "adam-os7-eos-drivers");
fixtures.push({
  ...profiles[0],
  name: "adamlink hybrid",
  media: buildHybridDisk(hybridProgram)
});

try {
for (const profile of fixtures) {
  const core = await GearcolecoTestCore.create({ seed: 0x53455249 });
  try {
    core.loadAdamFirmware(firmware);
    core.startAdam();
    core.loadAdamMedia(profile.media, {
      slot: profile.slot || GEARCOLECO_ADAM_SLOT.DISK_1,
      type: profile.type || GEARCOLECO_ADAM_MEDIA.DISK
    });
    core.reset();
    core.setAdamSerialProfile(profile.emulatorProfile || profile.name.split(" ")[0]);
    core.setAdamSerialCarrier(true);
    core.injectAdamSerialReceive(Uint8Array.of(0x41));
    for (let frame = 0; frame < (profile.name.includes("hybrid") ? 1200 : 180); frame += 1) core.runFrame();
    assert.deepEqual([...core.readRam(0x2100, profile.expected.length)], profile.expected,
      `${profile.name} Amy serial results`);
    assert.deepEqual([...core.readAdamSerialTransmit()], profile.expectedTransmit || [0x42], `${profile.name} Amy serial transmit`);
  } finally {
    core.destroy();
  }
}
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("Amy ADAM serial: PASS (native DSK/DDP, three interfaces, absent hardware; hybrid AdamLink)");

function compile(profile, memoryProfile = "adam-eos-application") {
  const romPath = path.join(temp, `${profile.name}-${memoryProfile}.bin`);
  const result = spawnSync(process.execPath, [
    path.join(root, "tools", "amyc.mjs"),
    path.join(root, "studio", "examples-src", profile.source),
    "--target", memoryProfile === "adam-os7-eos-drivers" ? "adam-disk" : "adam-native-program",
    "--medium", "dsk", "--memory-profile", memoryProfile,
    "--hardware", profile.hardware, "--opt", "balanced", "--rom", romPath
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, `${profile.name} ${memoryProfile} compile failed:\n${result.error?.stack || ""}\n${result.stdout || ""}${result.stderr || ""}`);
  return fs.readFileSync(romPath);
}

function buildHybridDisk(rom) {
  const romPath = path.join(temp, "hybrid.rom");
  const diskPath = path.join(temp, "hybrid.dsk");
  fs.writeFileSync(romPath, rom);
  const result = spawnSync(process.execPath, [
    path.join(root, "tools", "build-adam-hybrid-native-disk.mjs"), romPath, diskPath
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, `hybrid serial media build failed:\n${result.stdout || ""}${result.stderr || ""}`);
  return fs.readFileSync(diskPath);
}
