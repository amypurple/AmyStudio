#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const operators = ["=", "<>", "<", "<=", ">", ">="];
const variables = [
  ["u8", "U8Max", 255], ["u8", "U8Zero", 0],
  ["i8", "I8Neg", -1], ["i8", "I8Max", 127], ["i8", "I8Min", -128],
  ["u16", "U16Zero", 0], ["u16", "U16Byte", 255], ["u16", "U16Next", 256], ["u16", "U16High", 65535],
  ["i16", "I16Neg", -1], ["i16", "I16Byte", 255], ["i16", "I16Next", 256], ["i16", "I16Min", -32768], ["i16", "I16Max", 32767]
];
const valueByName = new Map(variables.map(([, name, value]) => [name, value]));
const pairs = [
  ["U8Max", "U16Next"], ["U16Next", "U8Max"], ["U8Max", "U16Byte"],
  ["I8Neg", "I16Neg"], ["I8Max", "I16Next"], ["I16Min", "I8Min"],
  ["I16Neg", "U8Max"], ["I16Byte", "U8Max"], ["U8Max", "I16Neg"], ["U8Max", "I16Next"],
  ["U16High", "I8Neg"], ["U16Zero", "I8Neg"], ["I8Neg", "U16High"], ["I8Max", "U16Next"]
];

function evaluate(left, operator, right) {
  if (operator === "=") return left === right;
  if (operator === "<>") return left !== right;
  if (operator === "<") return left < right;
  if (operator === "<=") return left <= right;
  if (operator === ">") return left > right;
  return left >= right;
}

const checks = [];
const lines = variables.map(([type, name, value]) => `${type} ${name} = ${value}`);
for (const [left, right] of pairs) {
  for (const operator of operators) {
    const name = `R${checks.length}`;
    lines.push(`u8 ${name} = 0`);
    checks.push({ name, expected: evaluate(valueByName.get(left), operator, valueByName.get(right)) ? 1 : 0 });
  }
}
lines.push("", "sub start:");
for (let index = 0; index < checks.length; index += 1) {
  const [left, right] = pairs[Math.floor(index / operators.length)];
  lines.push(`  if ${left} ${operators[index % operators.length]} ${right} then ${checks[index].name} = 1`);
}
lines.push("  loop forever", "end sub", "");

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

const temp = mkdtempSync(join(tmpdir(), "amy-compare-matrix-"));
try {
  const source = join(temp, "compare-matrix.alexis");
  writeFileSync(source, lines.join("\n"), "utf8");
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `compare-${profile}.asm`);
    const romPath = join(temp, `compare-${profile}.rom`);
    const build = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.doesNotMatch(asm, /AMY_CMP_(?:LEFT|RIGHT)32/, `${profile}: mixed 8/16 comparisons allocated 32-bit scratch RAM`);
    const core = await GearcolecoTestCore.create({ seed: 0x434D5031 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 20; frame += 1) core.runFrame();
      for (const check of checks) {
        const actual = core.readRam(addressOf(asm, `AMY_UVAR_${check.name}`), 1)[0];
        assert.equal(actual, check.expected, `${profile}: ${check.name}`);
      }
    } finally {
      core.destroy();
    }
  }
  console.log(`Numeric comparison matrix ROM: PASS (${checks.length} comparisons x ${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
