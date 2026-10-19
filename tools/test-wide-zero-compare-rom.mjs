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
  ["u32", "UZ", 0, "0"], ["u32", "UP", 4000000000, "4000000000"],
  ["i32", "IZ", 0, "0"], ["i32", "IN", -1, "-1"], ["i32", "IP", 2147483647, "2147483647"],
  ["fixed32", "FZ", 0, "0.0"], ["fixed32", "FN", -1.5, "-1.5"], ["fixed32", "FP", 1.5, "1.5"]
];

function evaluate(left, operator, right) {
  if (operator === "=") return left === right;
  if (operator === "<>") return left !== right;
  if (operator === "<") return left < right;
  if (operator === "<=") return left <= right;
  if (operator === ">") return left > right;
  return left >= right;
}

const lines = variables.map(([type, name, , literal]) => `${type} ${name} = ${literal}`);
const checks = [];
for (const [, name, value] of variables) {
  for (const operator of operators) {
    for (const reversed of [false, true]) {
      const result = `R${checks.length}`;
      lines.push(`u8 ${result} = 0`);
      checks.push({ result, left: reversed ? "0" : name, operator, right: reversed ? name : "0", expected: evaluate(reversed ? 0 : value, operator, reversed ? value : 0) ? 1 : 0 });
    }
  }
}
lines.push("u8 Complete = 0", "", "sub start:");
for (const check of checks) lines.push(`  if ${check.left} ${check.operator} ${check.right} then ${check.result} = 1`);
lines.push("  Complete = 1", "  loop forever", "end sub", "");

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

const temp = mkdtempSync(join(tmpdir(), "amy-wide-zero-"));
try {
  const source = join(temp, "wide-zero.alexis");
  writeFileSync(source, lines.join("\n"), "utf8");
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `wide-zero-${profile}.asm`);
    const romPath = join(temp, `wide-zero-${profile}.rom`);
    const build = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.doesNotMatch(asm, /AMY_CMP_(?:LEFT|RIGHT)32/, `${profile}: compare-to-zero allocated 32-bit scratch RAM`);
    const core = await GearcolecoTestCore.create({ seed: 0x5A45524F });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const completeAddress = addressOf(asm, "AMY_UVAR_Complete");
      let complete = false;
      for (let frame = 0; frame < 180; frame += 1) {
        core.runFrame();
        if (core.readRam(completeAddress, 1)[0] === 1) {
          complete = true;
          break;
        }
      }
      assert.ok(complete, `${profile}: comparison ROM did not complete`);
      const mismatches = checks.flatMap((check) => {
        const actual = core.readRam(addressOf(asm, `AMY_UVAR_${check.result}`), 1)[0];
        return actual === check.expected ? [] : [{ ...check, actual }];
      });
      assert.deepEqual(mismatches, [], `${profile}: ${mismatches.length} comparison mismatch(es)`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Wide zero comparison ROM: PASS (${checks.length} comparisons x ${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
