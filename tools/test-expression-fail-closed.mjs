#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-expression-matrix-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

function runCase(name, body, profile = "off", rom = false) {
  const source = join(temp, `${name}-${profile}.alexis`);
  const output = join(temp, `${name}-${profile}.${rom ? "rom" : "asm"}`);
  writeFileSync(source, `project "${name}"\nmemory "colecovision_legacy_sdcc"\n${body}\n`);
  const mode = rom ? "--rom" : "--asm";
  const result = spawnSync(process.execPath, [amyc, source, mode, output, "--opt", profile], {
    cwd: root,
    encoding: "utf8"
  });
  return { ...result, output: `${result.stdout || ""}${result.stderr || ""}` };
}

const validBody = `
const Limit = 10
u8 X = 0
sub start:
  u8 Delay = 2
  wait Delay frames
  wait 3 - Delay frames
  X = Limit
  X = random(10)
  X = X + 1
  u8 Values[4]
  Values[3 - X] = 7
  X = Values[3 - X]
  loop forever
end sub`;
for (const profile of profiles) {
  const result = runCase("valid-expression", validBody, profile, true);
  assert.equal(result.status, 0, `${profile}: ${result.output}`);
}

const dynamicSpinnerBody = `
u8 Port = 1
i8 Delta = 0
sub start:
  Delta = spinner(Port)
  Delta = spinner(3 - Port)
  loop forever
end sub`;
for (const profile of profiles) {
  const result = runCase("dynamic-spinner", dynamicSpinnerBody, profile, true);
  assert.equal(result.status, 0, `${profile} dynamic spinner: ${result.output}`);
}
const invalidCases = [
  ["wide-array-index", `u8 Values[4]\nu16 Wide = 1\nu8 X = 0\nsub start:\n  X = Values[Wide]\n  loop forever\nend sub`, /Invalid runtime assignment/],
  ["random-no-arg-u8", `u8 X = 0\nsub start:\n  X = random()\n  loop forever\nend sub`, /Invalid runtime assignment/],
  ["unknown-symbol", `u8 X = 0\nsub start:\n  X = mysteryVar + 1\n  loop forever\nend sub`, /Invalid runtime assignment/],
  ["unknown-call", `u8 X = 0\nsub start:\n  X = frobnicate(2)\n  loop forever\nend sub`, /Invalid runtime assignment/],
  ["word-table-oob", `data L0 bytes $01\ndata Levels words = @L0\nu16 Address = 0\nsub start:\n  Address = Levels[9]\n  loop forever\nend sub`, /Word table Levels index 9 is out-of-range/]
];
for (const [name, body, expected] of invalidCases) {
  const result = runCase(name, body);
  assert.notEqual(result.status, 0, `${name} unexpectedly compiled`);
  assert.match(result.output, expected, `${name}: ${result.output}`);
  assert.doesNotMatch(result.output, /Maximum call stack|Invalid expression.*instruction|Assemble failed/, `${name} leaked past Amy diagnostics`);
}

console.log(`expression fail-closed matrix: PASS (${profiles.length * 2} valid ROM builds, ${invalidCases.length} clean errors)`);
