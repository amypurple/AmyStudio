import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(path.join(tmpdir(), "amy-user-jr-final-"));
const sourcePath = path.join(work, "jr-final.alexis");
const shiftingCode = Array.from({ length: 150 }, (_, index) =>
  `if V = ${index & 255} then goto Shift${index}\nShift${index}:`
).join("\n");
const farPadding = Array.from({ length: 140 }, () => "    nop").join("\n");

writeFileSync(sourcePath, `cartridge "JR FINAL/AMY/2026"
u8 V = 0
${shiftingCode}
  call asm NearMain
  loop forever
asm {
NearMain:
    bit 0,a
    jr z,NearTarget
    nop
    nop
    nop
NearTarget:
    call FarMain
    ret
FarMain:
    jr FarTarget
${farPadding}
FarTarget:
    ret
}
`, "utf8");

try {
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const asmPath = path.join(work, `jr-final-${profile}.asm`);
    const result = spawnSync(process.execPath, [
      path.join(repo, "tools", "amyc.mjs"), sourcePath,
      "--opt", profile,
      "--optimized-asm", asmPath
    ], { cwd: repo, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.stdout}\n${result.stderr}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.match(asm, /NearMain:\s*\r?\n\s*bit 0,a\s*\r?\n\s*jr z,NearTarget/i,
      `${profile}: an in-range hand-written JR must stay relative after address shifts`);
    assert.match(asm, /FarMain:\s*\r?\n\s*jp FarTarget/i,
      `${profile}: the final legalizer must expand a genuinely out-of-range JR`);
  }
  console.log("User ASM final JR legalization regression passed.");
} finally {
  rmSync(work, { recursive: true, force: true });
}
