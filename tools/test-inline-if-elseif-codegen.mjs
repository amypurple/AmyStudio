#!/usr/bin/env node
// Regression for modern single-line if / elseif / else chains.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function compileCase(name, source) {
  const dir = mkdtempSync(path.join(tmpdir(), `amy-inline-if-elseif-${name}-`));
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

const assignAsm = compileCase("assign-chain", `
project "Inline If Elseif Assign"
u8 A = 0
i16 Score = 0
sub start:
  if A = 1 then Score += 5 elseif A = 2 then Score -= 5 else Score = 0
  loop forever
end sub
`);
assert(!/elseif/i.test(assignAsm), "inline elseif leaked into generated ASM");
assert(/AMY_IF_NEXT_/.test(assignAsm), "inline elseif chain should emit intermediate branch labels");
assert(/AMY_IF_END_/.test(assignAsm), "inline elseif chain should emit an end label");

const returnAsm = compileCase("return-chain", `
project "Inline If Elseif Return"
u8 A = 0
function Pick() as u8
  if A = 1 then return 10 elseif A = 2 then return 20 else return 30
sub start:
  A = Pick()
  loop forever
end sub
`);
assert(!/elseif/i.test(returnAsm), "inline elseif return leaked into generated ASM");
assert(/ld a,10/.test(returnAsm) && /ld a,20/.test(returnAsm) && /ld a,30/.test(returnAsm), "inline return branches were not emitted");

const gotoAsm = compileCase("goto-chain", `
project "Inline If Elseif Goto"
u8 A = 0
sub start:
  if A = 1 then goto One elseif A = 2 then goto Two else goto Done
One:
  A = 3
  goto Done
Two:
  A = 4
Done:
  loop forever
end sub
`);
assert(!/elseif/i.test(gotoAsm), "inline elseif goto leaked into generated ASM");
assert(/jp z,AMY_ULBL_One/.test(gotoAsm) && /jp z,AMY_ULBL_Two/.test(gotoAsm), "inline goto branches were not emitted");

console.log("inline if/elseif codegen tests passed");
