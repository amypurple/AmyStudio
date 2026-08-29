#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-start-init-matrix-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

function build(name, body, profile) {
  const source = join(temp, `${name}-${profile}.alexis`);
  const asm = join(temp, `${name}-${profile}.asm`);
  const rom = join(temp, `${name}-${profile}.rom`);
  writeFileSync(source, `project "${name}"\nmemory "colecovision_legacy_sdcc"\n${body}\n`);
  const asmResult = spawnSync(process.execPath, [amyc, source, "--asm", asm, "--opt", profile], { cwd: root, encoding: "utf8" });
  assert.equal(asmResult.status, 0, `${name} ${profile} ASM: ${asmResult.stdout}${asmResult.stderr}`);
  const romResult = spawnSync(process.execPath, [amyc, source, "--rom", rom, "--opt", profile], { cwd: root, encoding: "utf8" });
  assert.equal(romResult.status, 0, `${name} ${profile} ROM: ${romResult.stdout}${romResult.stderr}`);
  return readFileSync(asm, "utf8");
}

const earlyReturn = `
u8 Done = 1
if Done = 1 then return
loop forever
`;
const runtimeInit = `
u8 Seed = 7
sub Add(u8 Value):
  Seed += Value
  return
end sub
sub start:
  Add(1)
  loop forever
end sub
`;
const normalStart = `
u8 Value = 0
Value += 1
loop forever
`;

for (const profile of profiles) {
  const returnAsm = build("start-early-return", earlyReturn, profile);
  assert.equal((returnAsm.match(/^AMY_START_FOREVER:$/gm) || []).length, 1, `${profile}: shared Start sink must be defined once`);
  assert.match(returnAsm, /jp (?:[a-z]+,)?AMY_START_FOREVER/i, `${profile}: early Start return must branch to the shared sink`);

  const initAsm = build("static-abi-runtime-init", runtimeInit, profile);
  assert.match(initAsm, /call AMY_INIT_RAM/, `${profile}: Start must call RAM init`);
  assert.match(
    initAsm,
    /xor a\s*\r?\n\s*ld hl,AMY_RAM_BASE\s*\r?\n\s*ld de,AMY_RAM_BASE\+1\s*\r?\n\s*ld bc,AMY_RAM_LIMIT-AMY_RAM_BASE-1\s*\r?\n\s*ld \(hl\),a\s*\r?\n\s*ldir\s*\r?\n\s*call AMY_INIT_RAM/,
    `${profile}: RAM must be zeroed completely before runtime initializers run`
  );
  assert.doesNotMatch(initAsm, /AMY_RUNTIME_INIT_INSERT/, `${profile}: runtime-init marker must not leak into generated ASM`);
  assert.equal((initAsm.match(/^AMY_INIT_RAM:$/gm) || []).length, 1, `${profile}: RAM init routine must be linked once`);
  assert.match(initAsm, /AMY_SPARM_Add_Value/, `${profile}: probe must exercise static ABI RAM`);

  const normalAsm = build("normal-start-tail", normalStart, profile);
  assert.equal((normalAsm.match(/^AMY_START_FOREVER:$/gm) || []).length, 1, `${profile}: normal Start sink must remain singular`);
  assert.doesNotMatch(normalAsm, /jp (?:[a-z]+,)?AMY_START_FOREVER/i, `${profile}: normal Start must not pay for an unused early-return jump`);
}

console.log(`Start/INIT structural matrix: PASS (${profiles.length * 6} real builds)`);
