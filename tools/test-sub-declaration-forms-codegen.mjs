#!/usr/bin/env node
// Regression tests for sub declaration forms and the dangerous case where a
// missing `end sub` silently swallows intended entry code after a routine.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runCase(name, source) {
  const dir = mkdtempSync(path.join(tmpdir(), `amy-sub-forms-${name}-`));
  try {
    const src = path.join(dir, `${name}.alexis`);
    const asm = path.join(dir, `${name}.asm`);
    writeFileSync(src, source, "utf8");
    const result = spawnSync(process.execPath, [path.join(REPO, "tools", "amyc.mjs"), src, "--asm", asm, "--opt", "safe"], {
      cwd: REPO,
      encoding: "utf8"
    });
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      asm: existsSync(asm) ? readFileSync(asm, "utf8") : ""
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function assertCompiles(name, source) {
  const result = runCase(name, source);
  assert.equal(result.status, 0, `${name} compile failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  return result.asm;
}

const emptyParenAsm = assertCompiles("empty-paren-forward-call", `
u8 X = 0
  text screen
  Ping
  print X at 1,1
  loop forever
sub Ping():
  X += 5
  return
end sub
`);
assert(/ld a,\(AMY_UVAR_X\)[\s\S]{0,80}add a,5[\s\S]{0,80}ld \(AMY_UVAR_X\),a/i.test(emptyParenAsm), "empty-paren sub call did not emit/invoke Ping body");

const bareAsm = assertCompiles("bare-forward-call", `
u8 X = 0
  text screen
  Ping
  print X at 1,1
  loop forever
sub Ping:
  X += 5
  return
end sub
`);
assert(/ld a,\(AMY_UVAR_X\)[\s\S]{0,80}add a,5[\s\S]{0,80}ld \(AMY_UVAR_X\),a/i.test(bareAsm), "bare sub call did not emit/invoke Ping body");


console.log("test-sub-declaration-forms-codegen: PASS");