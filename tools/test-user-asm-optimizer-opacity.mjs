import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(path.join(tmpdir(), "amy-user-asm-"));
const sourcePath = path.join(work, "opaque.alexis");

writeFileSync(sourcePath, `cartridge "ASM OPAQUE/AMY/2026"
u8 Q = 0
u8 Res = 0
  call asm Main
asm {
Main:
    ld a,(Q)
    cp 5
    ld a,0
    jr nc,Big
    ld a,1
Big:
    ld (Res),a
    ld hl,Tab
    ld bc,$20BE
Loop1:
    outi
    nop
    jp nz,Loop1
Hang:
    jp Hang
Tab:
    db 1,2,3
}
`, "utf8");

for (const level of ["safe", "balanced", "aggressive", "experimental"]) {
  const asmPath = path.join(work, `opaque-${level}.asm`);
  execFileSync(process.execPath, [
    path.join(repo, "tools", "amyc.mjs"),
    sourcePath,
    "--opt", level,
    "--optimized-asm", asmPath
  ], { cwd: repo, stdio: "pipe" });

  const asm = readFileSync(asmPath, "utf8");
  assert.match(asm, /\bld a,0\b/i, `${level}: user ASM must preserve LD A,0 flags`);
  assert.match(asm, /\bjp nz,Loop1\b/i, `${level}: user ASM must preserve JP timing`);
  assert.doesNotMatch(asm, /\bjr nz,Loop1\b/i, `${level}: user ASM JP must not be shortened`);
  assert.match(asm, /AMY_OPTIMIZER_TIMING_BEGIN_USER_ASM_/i, `${level}: detached user ASM must be marked`);
}

console.log("User ASM optimizer opacity regression passed.");
