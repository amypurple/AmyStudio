#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GearcolecoTestCore, GEARCOLECO_ADAM_MEDIA, GEARCOLECO_ADAM_SLOT } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(import.meta.dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-call-asm-hybrid-"));

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  assert.equal(result.status, 0, `${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)$`, "mi"));
  assert.ok(match, `missing address for ${name}`);
  return Number.parseInt(match[1], 16);
}

try {
  const sourcePath = path.join(temp, "hybrid.alexis");
  const asmPath = path.join(temp, "hybrid.asm");
  const romPath = path.join(temp, "hybrid.rom");
  const diskPath = path.join(temp, "hybrid.dsk");
  fs.writeFileSync(sourcePath, `
u8 ByteValue = 41
u16 WordValue = $1233
u8 Buffer[2]
u8 Passed = 0

sub start:
  call asm CheckHybrid with a = ByteValue + 1, hl = WordValue + 1, de = address of Buffer
  loop forever

asm {
CheckHybrid:
  cp 42
  ret nz
  ld a,h
  cp $12
  ret nz
  ld a,l
  cp $34
  ret nz
  ld a,$A5
  ld (de),a
  ld (AMY_UVAR_Passed),a
  ret
}
`);
  runNode([
    path.join(root, "tools", "amyc.mjs"), sourcePath,
    "--target", "adam-disk", "--medium", "dsk",
    "--memory-profile", "adam-os7-eos-drivers",
    "--opt", "balanced", "--asm", asmPath, "--rom", romPath
  ]);
  runNode([path.join(root, "tools", "build-adam-hybrid-native-disk.mjs"), romPath, diskPath]);

  const asm = fs.readFileSync(asmPath, "utf8");
  assert.match(asm, /ld hl,AMY_UVAR_Buffer\s+push hl[\s\S]*pop de/i, "hybrid address argument was not staged");
  const firmwareRoot = path.join(root, "studio", "bios", "adam");
  const core = await GearcolecoTestCore.create({ seed: 0x41534D48 });
  try {
    core.loadAdamFirmware({
      os7: fs.readFileSync(path.join(firmwareRoot, "OS7.ROM")),
      eos: fs.readFileSync(path.join(firmwareRoot, "EOS.ROM")),
      smartwriter: fs.readFileSync(path.join(firmwareRoot, "WP.ROM"))
    });
    core.startAdam();
    core.loadAdamMedia(fs.readFileSync(diskPath), {
      slot: GEARCOLECO_ADAM_SLOT.DISK_1,
      type: GEARCOLECO_ADAM_MEDIA.DISK,
      writeProtected: true
    });
    core.reset();
    const passed = addressOf(asm, "Passed");
    for (let frame = 0; frame < 1200 && core.readRam(passed, 1)[0] !== 0xA5; frame += 1) core.runFrame();
    assert.equal(core.readRam(passed, 1)[0], 0xA5, "hybrid scalar arguments did not reach inline ASM");
    assert.equal(core.readRam(addressOf(asm, "Buffer"), 1)[0], 0xA5, "hybrid address argument did not write through DE");
  } finally {
    core.destroy();
  }
  console.log("Hybrid call asm ABI: PASS (calculated scalars and address argument runtime-verified)");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
