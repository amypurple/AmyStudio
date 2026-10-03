#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildAdamBootDataPack, buildAdamBootDisk } from "../studio/core/adamDiskImage.js";
import { GearcolecoTestCore, GEARCOLECO_ADAM_MEDIA, GEARCOLECO_ADAM_SLOT } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(import.meta.dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-eos-ay-"));
const boot = fs.readFileSync(path.join(root, "build", "adam-native-eos-ay-smoke.bin"));
const asm = fs.readFileSync(path.join(root, "build", "adam-native-eos-ay-smoke.asm"), "utf8");
assert.match(asm, /out \(SGM_AY_REG_PORT\),a/);
assert.match(asm, /out \(SGM_AY_WRITE_PORT\),a/);
assert.doesNotMatch(asm, /SGM_RAM_(?:UPPER|LOWER)_PORT/);

const firmwareRoot = path.join(root, "studio", "bios", "adam");
const firmware = {
  os7: fs.readFileSync(path.join(firmwareRoot, "OS7.ROM")),
  eos: fs.readFileSync(path.join(firmwareRoot, "EOS.ROM")),
  smartwriter: fs.readFileSync(path.join(firmwareRoot, "WP.ROM"))
};

try {
  const hybridRom = compileHybrid();
  for (const fixture of [
    { name: "native DSK Sound Enhancer", profile: "enhancer", media: buildAdamBootDisk({ boot, volume: "AMY AY" }).media, slot: GEARCOLECO_ADAM_SLOT.DISK_1, type: GEARCOLECO_ADAM_MEDIA.DISK },
    { name: "native DDP Opcode SGM", profile: "sgm", media: buildAdamBootDataPack({ boot, volume: "AMY AY" }).media, slot: GEARCOLECO_ADAM_SLOT.DATA_PACK_1, type: GEARCOLECO_ADAM_MEDIA.DATA_PACK },
    { name: "hybrid DSK Sound Enhancer", profile: "enhancer", media: buildHybridDisk(hybridRom), slot: GEARCOLECO_ADAM_SLOT.DISK_1, type: GEARCOLECO_ADAM_MEDIA.DISK }
  ]) {
    const core = await GearcolecoTestCore.create({ seed: 0x4159 });
    try {
      core.setAdamSoundExpansion(fixture.profile);
      core.loadAdamFirmware(firmware);
      core.startAdam();
      core.loadAdamMedia(fixture.media, { slot: fixture.slot, type: fixture.type, writeProtected: true });
      core.reset();

      let nonZero = 0;
      for (let frame = 0; frame < 1200; frame++) {
        core.runFrame();
        const audio = core.getAudioFrame();
        for (const sample of audio.samples) if (sample !== 0) nonZero++;
      }

      core.debugAdamPortOut(0x50, 8);
      assert.equal(core.debugAdamPortIn(0x52), 13, `${fixture.name} AY volume register`);
      assert.ok(nonZero > 1000, `${fixture.name} produced only ${nonZero} nonzero PCM samples`);
    } finally {
      core.destroy();
    }
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log(`Amy EOS AY: PASS (${boot.length} byte native program; native DSK/DDP and hybrid DSK registers plus PCM verified)`);

function compileHybrid() {
  const source = path.join(root, "studio", "examples-src", "adam-native-eos-ay-smoke.alexis");
  const asmPath = path.join(temp, "hybrid.asm");
  const romPath = path.join(temp, "hybrid.rom");
  const result = spawnSync(process.execPath, [
    path.join(root, "tools", "amyc.mjs"), source,
    "--target", "adam-disk", "--medium", "dsk",
    "--memory-profile", "adam-os7-eos-drivers",
    "--hardware", "adam-sound-enhancer",
    "--opt", "balanced", "--asm", asmPath, "--rom", romPath
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, `hybrid AY compile failed:\n${result.error?.stack || ""}\n${result.stdout || ""}${result.stderr || ""}`);
  const hybridAsm = fs.readFileSync(asmPath, "utf8");
  assert.match(hybridAsm, /out \(SGM_AY_REG_PORT\),a/);
  assert.doesNotMatch(hybridAsm, /SGM_RAM_(?:UPPER|LOWER)_PORT/);
  return fs.readFileSync(romPath);
}

function buildHybridDisk(rom) {
  const romPath = path.join(temp, "hybrid-media.rom");
  const diskPath = path.join(temp, "hybrid-media.dsk");
  fs.writeFileSync(romPath, rom);
  const result = spawnSync(process.execPath, [
    path.join(root, "tools", "build-adam-hybrid-native-disk.mjs"), romPath, diskPath
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, `hybrid AY media build failed:\n${result.error?.stack || ""}\n${result.stdout || ""}${result.stderr || ""}`);
  return fs.readFileSync(diskPath);
}
