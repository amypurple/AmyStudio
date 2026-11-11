#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-megacart-diagnostic-"));
try {
  const source = join(temp, "case.alexis");
  writeFileSync(source, `
project "MegaCart unresolved import"
memory "colecovision-megacart"
bank rom 128
copy Pic from bank 2 count 8 to vram.name
loop forever
`);
  for (const args of [[], ["--target", "colecovision-megacart"]]) {
    const result = spawnSync(process.execPath, [
      resolve(root, "tools/amyc.mjs"), source, ...args, "--output", join(temp, "case.rom")
    ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 1);
    const output = `${result.stdout || ""}${result.stderr || ""}`;
    assert.match(output, /Standalone Amy source cannot resolve MegaCart banked imports/i);
    assert.match(output, /megacart-bank-demo\.amy\.json/i);
    assert.doesNotMatch(output, /Invalid expression: AMY_MEGACART/i);
  }
  console.log("MegaCart standalone import diagnostic: PASS");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
