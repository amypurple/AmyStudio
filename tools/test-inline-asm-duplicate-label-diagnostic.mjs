#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-dup-label-"));
const source = join(temp, "duplicate.alexis");
writeFileSync(source, [
  'cartridge "DUP/LABEL/2026"',
  "call asm Entry",
  "asm {",
  "Entry:",
  "  ret",
  "",
  "; first definition follows",
  "Shared:",
  "  nop",
  "  ret",
  "",
  "; duplicate definition follows",
  "Shared:",
  "  nop",
  "  ret",
  "}",
].join("\n"));

try {
  const result = spawnSync(process.execPath, [resolve(root, "tools/amyc.mjs"), source, "--opt", "balanced"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  assert.equal(result.status, 1, output);
  assert.match(output, /Amy line 13 \(inline ASM\)/);
  assert.match(output, /First defined at Amy line 8/);
  assert.match(output, /Source: Shared:/);
  assert.doesNotMatch(output, /Amy line 15/);
  console.log("inline ASM duplicate-label diagnostic: PASS");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
