#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-inline-asm-diagnostic-"));
const source = join(temp, "unknown.alexis");
writeFileSync(source, [
  'cartridge "ASM/DIAGNOSTIC/2026"',
  "u8 Line[4]",
  "asm {",
  "MissingRoutine:",
  "  ld hl,MissingAmyName",
  "  ret",
  "}",
  "call asm MissingRoutine",
  "loop forever",
].join("\n"));

try {
  const result = spawnSync(process.execPath, [resolve(root, "tools/amyc.mjs"), source, "--opt", "balanced"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  assert.equal(result.status, 1, output);
  assert.match(output, /Amy line 5 \(inline ASM\)/);
  assert.match(output, /use amy\(Name\)/i);
  assert.match(output, /Source: ld hl,MissingAmyName/);
  assert.doesNotMatch(output, /at Assembler\.|compilerCore\.js:\d+/);
  console.log("inline ASM CLI diagnostic: PASS");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
