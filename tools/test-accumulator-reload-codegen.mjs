#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { optimizeGeneratedMemoryLoads } from "../studio/core/compiler/transpileFinalizationHelpers.js";

const root = resolve(import.meta.dirname, "..");
const compiler = join(root, "tools", "amyc.mjs");
const levels = ["none", "safe", "balanced", "aggressive", "experimental"];
const cases = [
  ["shift right", "Source >> 2"], ["shift left", "Source << 2"],
  ["logical and", "Source & $3F"], ["logical or", "Source | $40"],
  ["logical xor", "Source ^ $55"], ["addition", "Source + 3"],
  ["subtraction", "Source - 3"],
];
const mutations = [
  "srl a", "sla a", "sra a", "rlc a", "rl a", "rrc a", "rr a",
  "rlca", "rla", "rrca", "rra", "res 2,a", "set 3,a",
  "daa", "rld", "rrd", "ex af,af'",
];

for (const instruction of mutations) {
  const output = optimizeGeneratedMemoryLoads([
    "    ld a,(Source)", `    ${instruction}`, "    ld (First),a",
    "    ld a,(Source)", "    ld (Second),a",
  ]).join("\n");
  assert.match(output, /ld \(First\),a\s+ld a,\(Source\)/i,
    `${instruction}: transformed A must invalidate cached Source:\n${output}`);
}

const directory = mkdtempSync(join(tmpdir(), "amy-accumulator-reload-"));
try {
  for (const [name, expression] of cases) {
    for (const level of levels) {
      const sourcePath = join(directory, "fixture.alexis");
      const asmPath = join(directory, "fixture.asm");
      writeFileSync(sourcePath, `project "Accumulator reload fixture"
u8 Source = $97
u8 First = 0
u8 Second = 0
sub start:
  First = ${expression}
  Second = Source & 3
  loop forever
end sub
`);
      execFileSync(process.execPath, [compiler, sourcePath, "--asm", asmPath, "--opt", level], { cwd: root, stdio: "pipe" });
      const asm = readFileSync(asmPath, "utf8");
      const first = asm.indexOf("ld (AMY_UVAR_First),a");
      const second = asm.indexOf("ld (AMY_UVAR_Second),a", first + 1);
      assert.notEqual(first, -1, `${name}/${level}: First store missing`);
      assert.notEqual(second, -1, `${name}/${level}: Second store missing`);
      assert.match(asm.slice(first, second), /ld a,\(AMY_UVAR_Source\)/i,
        `${name}/${level}: Source reload missing`);
    }
  }
  console.log(`Accumulator reload codegen: ${cases.length * levels.length} compiler cases and ${mutations.length} Z80 mutation cases passed.`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
