#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

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
Mask ^= 1
Mask &= 254
Mask |= 8
SignedMask ^= 127
loop forever
`);

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
  assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}`);
  const asm = readFileSync(asmPath, "utf8");
  for (const operation of ["xor 1", "and 254", "or 8"]) {
    assert.match(
      asm,
      new RegExp(`ld hl,AMY_UVAR_Mask\\s*\\r?\\n\\s*ld a,\\(hl\\)\\s*\\r?\\n\\s*${operation}\\s*\\r?\\n\\s*ld \\(hl\\),a`, "i"),
      `${profile}: ${operation} must share one safe scalar address`
    );
  }
  assert.match(asm, /ld hl,AMY_UVAR_SignedMask\s*\r?\n\s*ld a,\(hl\)\s*\r?\n\s*xor 127\s*\r?\n\s*ld \(hl\),a/i, `${profile}: signed byte XOR must use identical byte semantics`);
}

console.log(`Byte compound bitwise lowering: PASS (${profiles.length} real ROM builds)`);
