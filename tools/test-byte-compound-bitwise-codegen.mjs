#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-byte-compound-bitwise-"));
const source = join(temp, "byte-compound-bitwise.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `
project "Byte compound bitwise lowering"
memory "colecovision_legacy_sdcc"
u8 Mask = 170
i8 SignedMask = 85
u8 Index = 2
u8 DynamicMask = 48
u8 Values[4]
Mask ^= 1
Mask &= 254
Mask |= 8
SignedMask ^= 127
Values[Index] = 3
Values[Index] |= 64
Values[Index] &= 253
Values[Index] ^= 1
Values[Index] |= DynamicMask
Values[Index] ^= DynamicMask
Values[Index] &= DynamicMask
loop forever
`);

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `Missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

for (const profile of profiles) {
  const asmPath = join(temp, `${profile}.asm`);
  const romPath = join(temp, `${profile}.rom`);
  const result = spawnSync(process.execPath, [
    amyc,
    source,
    "--asm", asmPath,
    "--rom", romPath,
    "--opt", profile
  ], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}${result.error ? `\n${result.error.stack || result.error}` : ""}`);
  const asm = readFileSync(asmPath, "utf8");
  const maskBlock = asm.match(/ld hl,AMY_UVAR_Mask([\s\S]*?)ld hl,AMY_UVAR_SignedMask/i)?.[0] || "";
  assert.ok(maskBlock, `${profile}: scalar Mask block must keep an address in HL`);
  for (const operation of ["xor 1", "and 254", "or 8"]) {
    assert.match(
      maskBlock,
      new RegExp(`ld a,\\(hl\\)\\s*\\r?\\n\\s*${operation}\\s*\\r?\\n\\s*ld \\(hl\\),a`, "i"),
      `${profile}: ${operation} must read and write through the shared scalar address`
    );
  }
  assert.match(asm, /ld hl,AMY_UVAR_SignedMask\s*\r?\n\s*ld a,\(hl\)\s*\r?\n\s*xor 127\s*\r?\n\s*ld \(hl\),a/i, `${profile}: signed byte XOR must use identical byte semantics`);
  for (const operation of ["or 64", "and 253", "xor 1"]) {
    assert.match(
      asm,
      new RegExp(`add hl,de\\s*\\r?\\n\\s*ld a,\\(hl\\)\\s*\\r?\\n\\s*${operation}\\s*\\r?\\n\\s*ld \\(hl\\),a`, "i"),
      `${profile}: indexed ${operation} must calculate its address once`
    );
  }
  for (const operation of ["or b", "xor b", "and b"]) {
    assert.match(
      asm,
      new RegExp(`ld a,\\(AMY_UVAR_DynamicMask\\)\\s*\\r?\\n\\s*push af[\\s\\S]{0,220}?pop bc\\s*\\r?\\n\\s*ld a,\\(hl\\)\\s*\\r?\\n\\s*${operation}\\s*\\r?\\n\\s*ld \\(hl\\),a`, "i"),
      `${profile}: indexed dynamic ${operation} must calculate its address once`
    );
  }
  const biosPath = join(root, "studio", "bios", "colecovision.rom");
  if (existsSync(biosPath)) {
    const core = await GearcolecoTestCore.create({ seed: 0x5A17 });
    try {
      core.loadBios(readFileSync(biosPath));
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 30; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "Mask"), 1)[0], 170, `${profile}: scalar byte result`);
      assert.equal(core.readRam(addressOf(asm, "SignedMask"), 1)[0], 42, `${profile}: signed byte result`);
      assert.equal(core.readRam(addressOf(asm, "Values") + 2, 1)[0], 0, `${profile}: indexed byte result`);
    } finally {
      core.destroy();
    }
  }
}

console.log(`Byte compound bitwise lowering: PASS (${profiles.length} real ROM builds)`);
