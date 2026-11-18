#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(path.join(tmpdir(), "amy-inline-asm-symbol-"));

try {
  const source = path.join(temp, "mnemonic-label.alexis");
  const asmPath = path.join(temp, "mnemonic-label.asm");
  writeFileSync(source, `
u8 Value = 0
  goto out
out:
  call asm Poke
forever:
  goto forever
asm {
Poke:
    ld a,(Value)
    nop ; value in [min(D,E), max(D,E)+1]
    nop ; amy(Missing) and Fake[Row,Column] are comments
    out ($BE),a ; out must remain an opcode
    jp out
}
`, "utf8");
  for (const optimization of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const result = spawnSync(process.execPath, [path.join(repo, "tools", "amyc.mjs"), source, "--asm", asmPath, "--opt", optimization], {
      cwd: repo,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${optimization}: ${result.stdout}\n${result.stderr}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.match(asm, /^\s*out \(\$BE\),a ; out must remain an opcode$/mi);
    assert.match(asm, /^\s*jp AMY_ULBL_out$/mi);
    assert.match(asm, /^\s*ld a,\(AMY_UVAR_Value\)$/mi);
    assert.match(asm, /^\s*nop ; value in \[min\(D,E\), max\(D,E\)\+1\]$/mi);
    assert.match(asm, /^\s*nop ; amy\(Missing\) and Fake\[Row,Column\] are comments$/mi);
    assert.doesNotMatch(asm, /amy_ulbl_out\s+\(\$BE\)/i);
  }
  console.log("test-inline-asm-symbol-codegen: PASS");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
