#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-byte-word-widening-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = join(temp, "widen.alexis");

writeFileSync(source, `project "byte word widening"
memory "colecovision_legacy_sdcc"
u8 Delay = 2
i8 Signed = -2
u16 Wide = 0
i16 SignedWide = 0
sub start:
  wait Delay frames
  Wide = Delay
  SignedWide = Signed
  loop forever
end sub
`);

for (const profile of profiles) {
  const asmPath = join(temp, `widen-${profile}.asm`);
  const romPath = join(temp, `widen-${profile}.rom`);
  const asmResult = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--opt", profile], { cwd: root, encoding: "utf8" });
  assert.equal(asmResult.status, 0, `${profile} ASM: ${asmResult.stdout}${asmResult.stderr}`);
  const asm = readFileSync(asmPath, "utf8");
  assert.match(asm, /ld a,\(AMY_UVAR_Delay\)[\s\S]{0,80}ld l,a\s*\n\s*ld h,0\s*\n\s*call AMY_WAIT_FRAMES_SAFE/, `${profile}: wait u8 must zero-extend into HL`);
  assert.match(asm, /ld a,\(AMY_UVAR_Signed\)[\s\S]{0,80}ld l,a\s*\n\s*add a,a\s*\n\s*sbc a,a\s*\n\s*ld h,a/, `${profile}: i8 must sign-extend into HL`);
  const romResult = spawnSync(process.execPath, [amyc, source, "--rom", romPath, "--opt", profile], { cwd: root, encoding: "utf8" });
  assert.equal(romResult.status, 0, `${profile} ROM: ${romResult.stdout}${romResult.stderr}`);
}

console.log(`byte-to-word widening: PASS (${profiles.length * 2} real builds)`);
