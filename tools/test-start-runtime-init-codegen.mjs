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
writeFileSync(join(temp, "external.asm"), "; external ASM may reference generated ABI labels\n");

function build(name, body, profile) {
  const source = join(temp, `${name}-${profile}.alexis`);
  const asm = join(temp, `${name}-${profile}.asm`);
  const rom = join(temp, `${name}-${profile}.rom`);
  writeFileSync(source, `project "${name}"\nmemory "colecovision_legacy_sdcc"\n${body}\n`);
  const asmResult = spawnSync(process.execPath, [amyc, source, "--asm", asm, "--opt", profile, "--project-dir", temp], { cwd: root, encoding: "utf8" });
  assert.equal(asmResult.status, 0, `${name} ${profile} ASM: ${asmResult.stdout}${asmResult.stderr}`);
  const romResult = spawnSync(process.execPath, [amyc, source, "--rom", rom, "--opt", profile, "--project-dir", temp], { cwd: root, encoding: "utf8" });
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
const redirectedStart = `
u8 Value = 0
Redirect:
Value += 1
goto Redirect
`;
const redirectedWithAsm = `${redirectedStart}\ninclude asm "@project/external.asm"\n`;
const runtimeInitWithAsm = `${runtimeInit}\ninclude asm "@project/external.asm"\n`;

for (const profile of profiles) {
  const returnAsm = build("start-early-return", earlyReturn, profile);
  assert.equal((returnAsm.match(/^AMY_START_FOREVER:$/gm) || []).length, 1, `${profile}: shared Start sink must be defined once`);
  assert.match(returnAsm, /jp (?:[a-z]+,)?AMY_START_FOREVER/i, `${profile}: early Start return must branch to the shared sink`);

  const initAsm = build("static-abi-runtime-init", runtimeInit, profile);
  assert.doesNotMatch(initAsm, /call AMY_INIT_RAM/, `${profile}: generated-only RAM init should be inlined`);
  assert.match(
    initAsm,
    /xor a\s*\r?\n\s*ld hl,AMY_RAM_BASE\s*\r?\n\s*ld de,AMY_RAM_BASE\+1\s*\r?\n\s*ld bc,AMY_RAM_LIMIT-AMY_RAM_BASE-1\s*\r?\n\s*ld \(hl\),a\s*\r?\n\s*ldir\s*\r?\n\s*ld a,\$07\s*\r?\n\s*ld \(\$7020\),a/,
    `${profile}: RAM must be zeroed completely before runtime initializers run`
  );
  assert.doesNotMatch(initAsm, /AMY_RUNTIME_INIT_INSERT/, `${profile}: runtime-init marker must not leak into generated ASM`);
  assert.doesNotMatch(initAsm, /^AMY_INIT_RAM:$/m, `${profile}: inlined RAM init must not retain a callable routine`);
  assert.match(initAsm, /AMY_SPARM_Add_Value/, `${profile}: probe must exercise static ABI RAM`);

  const externalInitAsm = build("static-abi-runtime-init-external-asm", runtimeInitWithAsm, profile);
  assert.match(externalInitAsm, /call AMY_INIT_RAM/, `${profile}: external ASM must preserve the RAM-init call ABI`);
  assert.equal((externalInitAsm.match(/^AMY_INIT_RAM:$/gm) || []).length, 1, `${profile}: external ASM must preserve the RAM-init symbol`);

  const normalAsm = build("normal-start-tail", normalStart, profile);
  assert.equal((normalAsm.match(/^AMY_START_FOREVER:$/gm) || []).length, 1, `${profile}: normal Start sink must remain singular`);
  assert.doesNotMatch(normalAsm, /jp (?:[a-z]+,)?AMY_START_FOREVER/i, `${profile}: normal Start must not pay for an unused early-return jump`);

  const redirectedAsm = build("redirected-start-tail", redirectedStart, profile);
  assert.match(redirectedAsm, /^AMY_START_FOREVER:$/m, `${profile}: the code/data boundary label must remain`);
  assert.doesNotMatch(redirectedAsm, /^AMY_START_FOREVER:\s*\r?\n\s+jr AMY_START_FOREVER/m, `${profile}: unreachable unreferenced Start sink must be omitted`);

  const externalAsm = build("redirected-start-external-asm", redirectedWithAsm, profile);
  assert.match(externalAsm, /^AMY_START_FOREVER:\s*\r?\n\s+jr AMY_START_FOREVER/m, `${profile}: external ASM must preserve the callable Start sink`);
}

console.log(`Start/INIT structural matrix: PASS (${profiles.length * 12} real builds)`);
