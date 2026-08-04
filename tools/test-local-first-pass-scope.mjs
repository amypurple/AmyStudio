#!/usr/bin/env node
// Regression for the first-pass symbol scan: implicit locals declared inside a
// sub/function must not be predeclared as global AMY_UVAR symbols.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function compileCase(name, source) {
  const dir = mkdtempSync(path.join(tmpdir(), `amy-local-first-pass-${name}-`));
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

const implicitLocalAsm = compileCase("implicit-local", `
sub start:
  u8 Scratch = 7
  Scratch += 1
  print at 1,1, Scratch
  loop forever
end sub
`);
assert(!/AMY_UVAR_Scratch\b/.test(implicitLocalAsm), "implicit local leaked a global AMY_UVAR_Scratch symbol");
assert(/\(ix-/.test(implicitLocalAsm), "implicit local should use IX-frame storage");

const topLevelGlobalAsm = compileCase("top-level-global", `
u8 Scratch = 7
sub start:
  Scratch += 1
  print at 1,1, Scratch
  loop forever
end sub
`);
assert(/AMY_UVAR_Scratch\b/.test(topLevelGlobalAsm), "top-level declaration should remain a global symbol");

const functionLocalAsm = compileCase("function-local", `
u8 Result = 0
function MakeValue() as u8
  u8 Scratch = 3
  Scratch += 2
  return Scratch

sub start:
  Result = MakeValue()
  Result = MakeValue()
  print at 1,1, Result
  loop forever
end sub
`);
assert(!/AMY_UVAR_Scratch\b/.test(functionLocalAsm), "function local leaked a global AMY_UVAR_Scratch symbol");
assert(/AMY_UPROC_MakeValue/.test(functionLocalAsm), "function body was not emitted");

const functionParamLocalAsm = compileCase("function-param-local", `
u8 Result = 0
function AddOne(u8 N) as u8
  u8 Scratch = N
  Scratch += 1
  return Scratch

sub start:
  Result = AddOne(4)
  Result = AddOne(Result)
  print at 1,1, Result
  loop forever
end sub
`);
assert(!/AMY_UVAR_Scratch\b/.test(functionParamLocalAsm), "parameterized function local leaked a global AMY_UVAR_Scratch symbol");
assert(/AMY_UPROC_AddOne/.test(functionParamLocalAsm), "parameterized function body was not emitted");


const staticLeafAsm = compileCase("static-leaf-local", `
u8 Result = 0
sub Leaf:
  u8 Scratch = 7
  Scratch += 1
  Result = Scratch
  return
end sub

sub start:
  Leaf
  print at 1,1, Result
  loop forever
end sub
`);
assert(/AMY_LVAR_Leaf_Scratch\b/.test(staticLeafAsm), "leaf sub local should use a private static local symbol");
const leafBlock = staticLeafAsm.slice(staticLeafAsm.indexOf("AMY_UPROC_Leaf:"), staticLeafAsm.indexOf("AMY_UPROC_Start:"));
assert(!/push ix|pop ix|ld sp,ix/i.test(leafBlock), "leaf static local sub should not emit an IX frame");
assert(!/AMY_UVAR_Scratch\b/.test(staticLeafAsm), "leaf static local leaked a global user variable");

const nonLeafAsm = compileCase("nonleaf-stack-local", `
u8 Result = 0
sub Callee:
  u8 Temp = 1
  Result = Temp
  return
end sub

sub Caller:
  u8 Scratch = 7
  Callee
  Scratch += 1
  Result = Scratch
  return
end sub

sub start:
  Caller
  print at 1,1, Result
  loop forever
end sub
`);
assert(/AMY_LVAR_Callee_Temp\b/.test(nonLeafAsm), "callee leaf local should use static storage");
const callerBlock = nonLeafAsm.slice(nonLeafAsm.indexOf("AMY_UPROC_Caller:"), nonLeafAsm.indexOf("AMY_UPROC_Start:"));
assert(!/push ix|\(ix-/i.test(callerBlock), "non-recursive non-leaf caller should use the static ABI");
assert(/AMY_LVAR_Caller_Scratch\b/.test(nonLeafAsm), "non-recursive non-leaf caller local should use static storage");

console.log("test-local-first-pass-scope: PASS");
