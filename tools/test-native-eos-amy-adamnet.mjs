#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildAdamBootDataPack, buildAdamBootDisk } from "../studio/core/adamDiskImage.js";
import { GearcolecoTestCore, GEARCOLECO_ADAM_MEDIA, GEARCOLECO_ADAM_SLOT } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(import.meta.dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-adamnet-"));

function compileProgram(name, source, args) {
  const sourcePath = path.join(temp, `${name}.alexis`);
  const asmPath = path.join(temp, `${name}.asm`);
  const binaryPath = path.join(temp, `${name}.bin`);
  fs.writeFileSync(sourcePath, source);
  const compile = spawnSync(process.execPath, [
    path.join(root, "tools", "amyc.mjs"), sourcePath,
    "--opt", "safe", "--asm", asmPath, "--rom", binaryPath,
    ...args
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(compile.status, 0, `${compile.error?.stack || ""}${compile.stdout || ""}${compile.stderr || ""}`);
  return {
    asm: fs.readFileSync(asmPath, "utf8"),
    binary: fs.readFileSync(binaryPath)
  };
}

function compileRejected(name, source, args) {
  const sourcePath = path.join(temp, `${name}.alexis`);
  fs.writeFileSync(sourcePath, source);
  return spawnSync(process.execPath, [path.join(root, "tools", "amyc.mjs"), sourcePath, ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
}

function buildHybridDisk(rom) {
  const romPath = path.join(temp, "adamnet-hybrid.rom");
  const diskPath = path.join(temp, "adamnet-hybrid.dsk");
  fs.writeFileSync(romPath, rom);
  const build = spawnSync(process.execPath, [
    path.join(root, "tools", "build-adam-hybrid-native-disk.mjs"), romPath, diskPath
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(build.status, 0, `${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
  return fs.readFileSync(diskPath);
}

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-F]+)$`, "mi"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const source = `
AdamNetDcb Request
u8 SubmitStatus = 0
u8 DeviceFlags = $FF
u8 DeviceStatus = $FF
u8 DeviceResult = $FF
u8 ResultStatus = $FF
u8 ResetStatus = $FF
u8 Passed = 0

Request.CommandStatus = 4
Request.BufferAddress = $2E00
Request.BufferLength = 1
Request.AddressCode = $06
submit Request to 3 status SubmitStatus
DeviceFlags = device status 1 status DeviceStatus
DeviceResult = device result 1 status ResultStatus
reset device 1 status ResetStatus
Passed = $5A
loop forever
`;
  const native = compileProgram("adamnet", source, ["--target", "adam-native-program", "--medium", "dsk"]);
  const boot = native.binary;
  const asm = native.asm;
  assert.ok(boot.length <= 1024, `generic AdamNet smoke test no longer fits the boot block (${boot.length} bytes)`);
  const request = addressOf(asm, "AMY_UVAR_Request");
  const submitStatus = addressOf(asm, "AMY_UVAR_SubmitStatus");
  const deviceStatus = addressOf(asm, "AMY_UVAR_DeviceStatus");
  const deviceResult = addressOf(asm, "AMY_UVAR_DeviceResult");
  const resultStatus = addressOf(asm, "AMY_UVAR_ResultStatus");
  const resetStatus = addressOf(asm, "AMY_UVAR_ResetStatus");
  const passed = addressOf(asm, "AMY_UVAR_Passed");
  const firmwareRoot = path.join(root, "studio", "bios", "adam");
  const firmware = {
    os7: fs.readFileSync(path.join(firmwareRoot, "OS7.ROM")),
    eos: fs.readFileSync(path.join(firmwareRoot, "EOS.ROM")),
    smartwriter: fs.readFileSync(path.join(firmwareRoot, "WP.ROM"))
  };

  const fixtures = [
    { name: "DSK", built: buildAdamBootDisk({ boot, volume: "AMY ADAMNET" }), slot: GEARCOLECO_ADAM_SLOT.DISK_1, type: GEARCOLECO_ADAM_MEDIA.DISK },
    { name: "DDP", built: buildAdamBootDataPack({ boot, volume: "AMY ADAMNET" }), slot: GEARCOLECO_ADAM_SLOT.DATA_PACK_1, type: GEARCOLECO_ADAM_MEDIA.DATA_PACK }
  ];
  for (const fixture of fixtures) {
    const core = await GearcolecoTestCore.create({ seed: 0x414E4554 });
    try {
      core.loadAdamFirmware(firmware);
      core.startAdam();
      core.loadAdamMedia(fixture.built.media, { slot: fixture.slot, type: fixture.type, writeProtected: true });
      core.reset();
      for (let frame = 0; frame < 300 && core.readRam(passed, 1)[0] !== 0x5A; frame += 1) core.runFrame();
      assert.equal(core.readRam(passed, 1)[0], 0x5A, `${fixture.name} did not continue after generic AdamNet completion: ${JSON.stringify(core.getAdamNetSummary())}`);
      assert.equal(core.readRam(submitStatus, 1)[0], 1, `${fixture.name} did not normalize the failed-device response: request=${JSON.stringify([...core.readRam(request, 21)])} net=${JSON.stringify(core.getAdamNetSummary())}`);
      assert.equal(core.readRam(deviceStatus, 1)[0], 0, `${fixture.name} keyboard status request failed`);
      assert.equal(core.readRam(deviceResult, 1)[0], 0x80, `${fixture.name} keyboard completion result changed`);
      assert.equal(core.readRam(resultStatus, 1)[0], 0, `${fixture.name} keyboard completion lookup failed`);
      assert.equal(core.readRam(resetStatus, 1)[0], 0, `${fixture.name} keyboard soft reset failed`);
      assert.ok([0x96, 0x9B].includes(core.readRam(request, 1)[0]), `${fixture.name} did not copy a known absent-device response back to Request.CommandStatus`);
    } finally {
      core.destroy();
    }
  }

  const hybrid = compileProgram("adamnet-hybrid", source, [
    "--target", "adam-disk", "--medium", "dsk", "--memory-profile", "adam-os7-eos-drivers"
  ]);
  const hybridRequest = addressOf(hybrid.asm, "AMY_UVAR_Request");
  const hybridSubmitStatus = addressOf(hybrid.asm, "AMY_UVAR_SubmitStatus");
  const hybridDeviceStatus = addressOf(hybrid.asm, "AMY_UVAR_DeviceStatus");
  const hybridDeviceResult = addressOf(hybrid.asm, "AMY_UVAR_DeviceResult");
  const hybridResultStatus = addressOf(hybrid.asm, "AMY_UVAR_ResultStatus");
  const hybridResetStatus = addressOf(hybrid.asm, "AMY_UVAR_ResetStatus");
  const hybridPassed = addressOf(hybrid.asm, "AMY_UVAR_Passed");
  const hybridCore = await GearcolecoTestCore.create({ seed: 0x414E4859 });
  try {
    hybridCore.loadAdamFirmware(firmware);
    hybridCore.startAdam();
    hybridCore.loadAdamMedia(buildHybridDisk(hybrid.binary), {
      slot: GEARCOLECO_ADAM_SLOT.DISK_1,
      type: GEARCOLECO_ADAM_MEDIA.DISK,
      writeProtected: true
    });
    hybridCore.reset();
    for (let frame = 0; frame < 1200 && hybridCore.readRam(hybridPassed, 1)[0] !== 0x5A; frame += 1) hybridCore.runFrame();
    assert.equal(hybridCore.readRam(hybridPassed, 1)[0], 0x5A, `hybrid did not continue after generic AdamNet completion: ${JSON.stringify(hybridCore.getAdamNetSummary())}`);
    assert.equal(hybridCore.readRam(hybridSubmitStatus, 1)[0], 1, "hybrid did not normalize the failed-device response");
    assert.equal(hybridCore.readRam(hybridDeviceStatus, 1)[0], 0, "hybrid keyboard status request failed");
    assert.equal(hybridCore.readRam(hybridDeviceResult, 1)[0], 0x80, "hybrid keyboard completion result changed");
    assert.equal(hybridCore.readRam(hybridResultStatus, 1)[0], 0, "hybrid keyboard completion lookup failed");
    assert.equal(hybridCore.readRam(hybridResetStatus, 1)[0], 0, "hybrid keyboard soft reset failed");
    assert.ok([0x96, 0x9B].includes(hybridCore.readRam(hybridRequest, 1)[0]), "hybrid did not copy a known absent-device response back to Request.CommandStatus");
  } finally {
    hybridCore.destroy();
  }

  const cartridge = compileRejected("adamnet-os7-reject", `
u8 Flags = 0
u8 Result = 0
Flags = device status 1 status Result
Flags = device result 1 status Result
reset device 1 status Result
loop forever
`, ["--target", "colecovision-cartridge", "--opt", "safe"]);
  assert.notEqual(cartridge.status, 0, "OS7 cartridge accepted EOS-only device commands");
  assert.match(`${cartridge.stdout || ""}${cartridge.stderr || ""}`, /device status requires an EOS-capable ADAM target/i);

  console.log(`Amy generic AdamNet: PASS (${boot.length}-byte native boot, native DSK/DDP and hybrid DSK status/reset/absent-device response round trips)`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
