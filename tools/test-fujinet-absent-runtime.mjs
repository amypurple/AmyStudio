#!/usr/bin/env node
// Without a FujiNet, every FujiNet statement fails at once and the program
// carries on. GearColeco has no FujiNet device, so this is what Studio's own
// emulator shows. ColecoVision: the cartridge mailbox signature is absent.
// ADAM (when firmware is available): EOS lists no DCB for the FujiNet devices.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildAdamBootDisk, buildAdamNativeProgramDisk } from "../studio/core/adamDiskImage.js";
import { GearcolecoTestCore, GEARCOLECO_ADAM_MEDIA, GEARCOLECO_ADAM_SLOT, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { RUNTIME_SOURCE, readSymbols } from "./lib/fujinet-runtime-rig.mjs";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-fujinet-absent-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const biosPath = process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom");
const adamFirmwareDir = process.env.AMY_ADAM_FIRMWARE_DIR || resolve(root, "studio/bios/adam");

// Every status reports failure, nothing is counted, and the program reaches Done.
const expected = {
  Present: 0, OpenS: 1, ReadS: 1, CloseS: 1, JOpenS: 1, StatS: 1, JsonS: 1, Q1S: 1, Q2S: 1, Q3S: 1,
  POpenS: 1, PModeS: 1, PWriteS: 1, PBodyS: 1, PReadS: 1, TOpenS: 1, TWriteS: 1, TReadS: 1, TRestS: 1,
  KeyW: 1, KeyR: 1, MissR: 1, TimeS: 1, VerS: 1, BadS: 1, Done: 1,
  Got: 0, Q1: 0, Q2: 0, Q3: 0, PGot: 0, TGot: 0, TRest: 0, KeyLen: 0, MissLen: 0, VerLen: 0
};

function compile(name, args) {
  const sourcePath = join(temp, "absent.alexis");
  writeFileSync(sourcePath, RUNTIME_SOURCE(1, 2));
  const binPath = join(temp, `${name}.bin`);
  const symPath = join(temp, `${name}.sym`);
  const build = spawnSync(process.execPath, [join(root, "tools", "amyc.mjs"), sourcePath, "--rom", binPath, "--symbols", symPath, ...args], {
    cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024
  });
  assert.equal(build.status, 0, `${name}: ${build.stdout}${build.stderr}`);
  return { binary: readFileSync(binPath), symbols: readSymbols(symPath) };
}

function check(core, symbols, label) {
  for (const [name, value] of Object.entries(expected)) {
    const address = symbols.get(`AMY_UVAR_${name}`);
    assert.ok(Number.isInteger(address), `${label}: no symbol for ${name}`);
    assert.equal(core.readRam(address, 1)[0], value, `${label}: ${name}`);
  }
}

async function assembleLoader(source, filename) {
  const result = await assembleAmysCVAssembly({ [filename]: source }, filename, {
    outputFilename: filename.replace(/\.asm$/i, ".bin"), outputMode: "binary", optimize: false
  });
  if (!result.ok) throw new Error(result.log);
  return result.binary || result.bytes;
}

try {
  const bios = readFileSync(biosPath);
  for (const profile of profiles) {
    const { binary, symbols } = compile(`cart-${profile}`, ["--hardware", "fujinet", "--opt", profile]);
    const core = await GearcolecoTestCore.create({ seed: 0x464E4F4E });
    try {
      core.loadBios(bios);
      core.loadRom(binary, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 60; frame += 1) core.runFrame();
      check(core, symbols, `ColecoVision/${profile}`);
    } finally {
      core.destroy();
    }
  }

  const firmwareFiles = ["OS7.ROM", "EOS.ROM", "WP.ROM"].map((name) => join(adamFirmwareDir, name));
  let adamNote = "ADAM skipped: no firmware in studio/bios/adam (or AMY_ADAM_FIRMWARE_DIR)";
  if (firmwareFiles.every((path) => existsSync(path))) {
    const [os7, eos, smartwriter] = firmwareFiles.map((path) => readFileSync(path));
    for (const profile of profiles) {
      const { binary, symbols } = compile(`adam-${profile}`, ["--target", "adam-native-program", "--medium", "dsk", "--hardware", "fujinet", "--opt", profile]);
      const media = binary.length <= 1024
        ? buildAdamBootDisk({ boot: binary, files: [], volume: "AMY FUJINET" }).media
        : (await buildAdamNativeProgramDisk({ program: binary, volume: "AMY FUJINET", assemble: assembleLoader })).media;
      const core = await GearcolecoTestCore.create({ seed: 0x464E4F4E });
      try {
        core.loadAdamFirmware({ os7, eos, smartwriter });
        core.startAdam();
        core.loadAdamMedia(media, { slot: GEARCOLECO_ADAM_SLOT.DISK_1, type: GEARCOLECO_ADAM_MEDIA.DISK });
        core.reset();
        for (let frame = 0; frame < 600; frame += 1) core.runFrame();
        check(core, symbols, `ADAM/${profile}`);
      } finally {
        core.destroy();
      }
    }
    adamNote = "ADAM native EOS";
  }
  console.log(`FujiNet absent runtime: PASS (${profiles.length} profiles: ColecoVision cartridge; ${adamNote}; every statement fails at once and the program continues)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
