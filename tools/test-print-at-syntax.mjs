#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function compile(source) {
  const dir = mkdtempSync(path.join(tmpdir(), "amy-print-at-syntax-"));
  try {
    const src = path.join(dir, "print.alexis");
    const asm = path.join(dir, "print.asm");
    writeFileSync(src, source, "utf8");
    const result = spawnSync(process.execPath, [path.join(REPO, "tools", "amyc.mjs"), src, "--asm", asm, "--opt", "safe"], {
      cwd: REPO,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `compile failed\n${result.stdout}\n${result.stderr}`);
    return readFileSync(asm, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const canonical = compile(`
project "Print Canonical"
u8 Score = 7
sub start:
  text screen
  print at 20,20, "WHITE", Score
  loop forever
end sub
`);

const relaxed = compile(`
project "Print Relaxed"
u8 Score = 7
sub start:
  text screen
  print at 20,20 "WHITE", Score
  loop forever
end sub
`);

const normalize = (asm) => asm.replace(/Print (Canonical|Relaxed)/g, "Print Test");
assert.equal(normalize(relaxed), normalize(canonical), "relaxed print-at syntax must generate the canonical ASM");

compile(`
project "Print Relaxed Y Expression"
u8 Y = 19
sub start:
  text screen
  print at 20,Y + 1 "TURN"
  loop forever
end sub
`);

console.log("print-at syntax tests passed");
