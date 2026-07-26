#!/usr/bin/env node
// Regression for runtime var*var / var/var in direct assignment and call-asm inputs.
// The broken path emitted immediate assembler expressions such as
// `ld a,AMY_UVAR_A * AMY_UVAR_B`, which is a silent wrong ROM for globals and
// an assembler error for locals.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function compileCase(name, source) {
  const dir = mkdtempSync(path.join(tmpdir(), `amy-muldiv-${name}-`));
  try {
    const src = path.join(dir, `${name}.alexis`);
    const asm = path.join(dir, `${name}.asm`);
    writeFileSync(src, source, "utf8");
    const result = spawnSync(process.execPath, [path.join(REPO, "tools", "amyc.mjs"), src, "--asm", asm, "--opt", "safe"], {
      cwd: REPO,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${name} compile failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    return readFileSync(asm, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function assertNoAddressExpression(asm, name) {
  assert(!/AMY_UVAR_[A-Za-z0-9_]+\s*[*/]\s*AMY_UVAR_[A-Za-z0-9_]+/.test(asm), `${name}: leaked AMY_UVAR immediate expression`);
  assert(!/ld\s+(?:a|hl),\s*AMY_UVAR_/i.test(asm), `${name}: direct ld immediate from runtime symbol expression survived`);
}

function check(name, source, patterns) {
  const asm = compileCase(name, source);
  assertNoAddressExpression(asm, name);
  for (const pattern of patterns) assert(pattern.test(asm), `${name}: missing ${pattern}`);
  console.log(`ok   ${name}`);
}

check("global-u8-mul-div", `
u8 A = 6
u8 B = 7
u8 C = 0
  C = A * B
  C = C / A
  loop forever
`, [/MUL8_EXPR_LOOP/i, /DIV8_EXPR_LOOP/i]);

check("local-u8-mul-div", `
sub start:
  u8 A = 6
  u8 B = 7
  u8 C = 0
  C = A * B
  C = C / A
  loop forever
end sub
`, [/MUL8_EXPR_LOOP/i, /DIV8_EXPR_LOOP/i, /\(ix-/]);

check("global-u16-mul-div", `
u16 A = 123
u16 B = 7
u16 C = 0
  C = A * B
  C = C / B
  loop forever
`, [/MUL16_EXPR_LOOP/i, /call AMY_U16_DIV/]);

check("local-u16-mul-div", `
sub start:
  u16 A = 123
  u16 B = 7
  u16 C = 0
  C = A * B
  C = C / B
  loop forever
end sub
`, [/MUL16_EXPR_LOOP/i, /call AMY_U16_DIV/, /\(ix-/]);

check("call-asm-byte-expr", `
u8 A = 6
u8 B = 7
asm {
MyRoutine:
  ret
}
  call asm MyRoutine with a = A * B
  call asm MyRoutine with a = A / B
  loop forever
`, [/MUL8_EXPR_LOOP/i, /DIV8_EXPR_LOOP/i, /call MyRoutine/]);

check("call-asm-word-expr", `
u16 A = 123
u16 B = 7
asm {
MyWordRoutine:
  ret
}
  call asm MyWordRoutine with hl = A * B
  call asm MyWordRoutine with hl = A / B
  loop forever
`, [/MUL16_EXPR_LOOP/i, /call AMY_U16_DIV/, /call MyWordRoutine/]);

console.log("test-mul-div-assign-codegen: PASS");
