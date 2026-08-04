#!/usr/bin/env node
// Regression tests for mixed signed/unsigned comparisons. The unsigned operand
// must be zero-extended into a wider signed container, never sign-extended in
// place as if u8/u16 were i8/i16.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function compileCase(name, source) {
  const dir = mkdtempSync(path.join(tmpdir(), `amy-mixed-compare-${name}-`));
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

function assertFastByteMixedCompare(asm, signedName, unsignedName) {
  assert(!/AMY_CMP_(?:LEFT|RIGHT)32/i.test(asm), "byte mixed compare should avoid scratch32");
  assert(new RegExp(`AMY_UVAR_${signedName}`, "i").test(asm), `${signedName}: signed operand missing`);
  assert(new RegExp(`AMY_UVAR_${unsignedName}`, "i").test(asm), `${unsignedName}: unsigned operand missing`);
  assert(/or a[\s\S]{0,80}jp m,/i.test(asm), "byte mixed compare should test signed negativity first");
  assert(/cp b/i.test(asm), "byte mixed compare should use native unsigned CP after sign test");
}

function assertFastWordMixedCompare(asm, signedName, unsignedName) {
  assert(!/AMY_CMP_(?:LEFT|RIGHT)32/i.test(asm), "word mixed compare should avoid scratch32");
  assert(new RegExp(`AMY_UVAR_${signedName}`, "i").test(asm), `${signedName}: signed operand missing`);
  assert(new RegExp(`AMY_UVAR_${unsignedName}`, "i").test(asm), `${unsignedName}: unsigned operand missing`);
  assert(/ld a,[hd][\s\S]{0,40}or a[\s\S]{0,80}jp m,/i.test(asm), "word mixed compare should test signed high-byte negativity first");
  assert(/sbc hl,de/i.test(asm), "word mixed compare should use native unsigned SBC HL,DE after sign test");
}

function check(name, source, checks) {
  const asm = compileCase(name, source);
  for (const checkFn of checks) checkFn(asm);
  console.log(`ok   ${name}`);
}
check("i8-gt-u8", `
i8 SA = 10
u8 UA = 200
u8 Result = 0
sub start:
  if SA > UA then
    Result = 9
  else
    Result = 5
  end if
  loop forever
end sub
`, [(asm) => assertFastByteMixedCompare(asm, "SA", "UA")]);

check("u8-gt-i8", `
u8 UA = 200
i8 SA = 10
u8 Result = 0
sub start:
  if UA > SA then
    Result = 9
  else
    Result = 5
  end if
  loop forever
end sub
`, [(asm) => assertFastByteMixedCompare(asm, "SA", "UA")]);

check("i16-gt-u16", `
i16 SW = 10
u16 UW = 60000
u8 Result = 0
sub start:
  if SW > UW then
    Result = 9
  else
    Result = 5
  end if
  loop forever
end sub
`, [(asm) => assertFastWordMixedCompare(asm, "SW", "UW")]);

console.log("test-mixed-sign-compare-codegen: PASS");