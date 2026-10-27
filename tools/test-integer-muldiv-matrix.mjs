#!/usr/bin/env node
// Exhaustive integer multiply/divide matrix. The test is split into ROM-sized
// batches, but this file is the single source of truth for types, edge values,
// generated Amy programs, and the independent JavaScript oracle.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const biosPath = join(root, "studio", "bios", "colecovision.rom");
const profiles = String(process.env.AMY_MATRIX_PROFILES || "balanced").split(",").map((value) => value.trim()).filter(Boolean);
const batchSize = Number.parseInt(process.env.AMY_MATRIX_BATCH || "36", 10);

const types = [
  { name: "i8", bits: 8, signed: true, values: [-128, -3, -2, -1, 0, 1, 2, 3, 127] },
  { name: "u8", bits: 8, signed: false, values: [0, 1, 2, 3, 255] },
  { name: "i16", bits: 16, signed: true, values: [-32768, -3, -2, -1, 0, 1, 2, 3, 32767] },
  { name: "u16", bits: 16, signed: false, values: [0, 1, 2, 3, 65535] },
  { name: "i32", bits: 32, signed: true, values: [-2147483648, -3, -2, -1, 0, 1, 2, 3, 2147483647] },
  { name: "u32", bits: 32, signed: false, values: [0, 1, 2, 3, 4294967295] }
];

function wrap(value, type) {
  const width = 1n << BigInt(type.bits);
  let wrapped = ((BigInt(value) % width) + width) % width;
  if (type.signed && wrapped >= (width >> 1n)) wrapped -= width;
  return wrapped;
}

function quotient(left, right) {
  if (right === 0n) return 0n;
  const magnitude = (left < 0n ? -left : left) / (right < 0n ? -right : right);
  return (left < 0n) !== (right < 0n) ? -magnitude : magnitude;
}

const cases = [];
for (const leftType of types) {
  for (const rightType of types) {
    const sameType = leftType === rightType;
    const leftValues = sameType ? leftType.values : [0, 1, 2, 3];
    const rightValues = sameType ? rightType.values : [0, 1, 2, 3];
    const resultBits = Math.max(leftType.bits, rightType.bits);
    const resultSigned = leftType.signed && rightType.signed;
    const resultType = types.find((type) => type.bits === resultBits && type.signed === resultSigned);
    assert.ok(resultType, `Missing promoted type for ${leftType.name}/${rightType.name}`);
    for (const left of [...new Set(leftValues)]) {
      for (const right of [...new Set(rightValues)]) {
        cases.push({ leftType, rightType, resultType, left, right });
      }
    }
  }
}

function amyLiteral(value) {
  return String(value);
}

function generateBatch(batch, batchIndex) {
  const lines = [
    `project "Integer muldiv matrix ${batchIndex}"`,
    'memory "colecovision_legacy_sdcc"',
    "u16 Failures = 0",
    "u16 Completed = 0"
  ];
  for (const type of types) {
    lines.push(`${type.name} Left_${type.name} = 0`);
    lines.push(`${type.name} Right_${type.name} = 0`);
    lines.push(`${type.name} WorkLeft_${type.name} = 0`);
    lines.push(`${type.name} WorkRight_${type.name} = 0`);
    lines.push(`${type.name} Result_${type.name} = 0`);
  }
  for (const item of batch) {
    const { leftType, rightType, resultType } = item;
    const left = BigInt(item.left);
    const right = BigInt(item.right);
    const multiply = wrap(left * right, resultType);
    const divide = wrap(quotient(left, right), resultType);
    const lhs = `Left_${leftType.name}`;
    const rhs = `Right_${rightType.name}`;
    const workLeft = `WorkLeft_${resultType.name}`;
    const workRight = `WorkRight_${resultType.name}`;
    const result = `Result_${resultType.name}`;
    lines.push(`${lhs} = ${amyLiteral(item.left)}`);
    lines.push(`${rhs} = ${amyLiteral(item.right)}`);
    lines.push(`${workLeft} = ${lhs}`);
    lines.push(`${workRight} = ${rhs}`);
    lines.push(`${result} = ${workLeft} * ${workRight}`);
    lines.push(`if ${result} <> ${multiply} then Failures += 1`);
    lines.push(`${result} = ${workLeft}`);
    lines.push(`${result} *= ${workRight}`);
    lines.push(`if ${result} <> ${multiply} then Failures += 1`);
    lines.push(`${result} = ${workLeft} / ${workRight}`);
    lines.push(`if ${result} <> ${divide} then Failures += 1`);
    lines.push(`${result} = ${workLeft}`);
    lines.push(`${result} /= ${workRight}`);
    lines.push(`if ${result} <> ${divide} then Failures += 1`);
    lines.push("Completed += 1");
  }
  lines.push("loop forever", "");
  return lines.join("\n");
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `Missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

function readWord(core, address) {
  const bytes = core.readRam(address, 2);
  return bytes[0] | (bytes[1] << 8);
}

assert.ok(existsSync(biosPath), `Missing BIOS: ${biosPath}`);
const temp = mkdtempSync(join(tmpdir(), "amy-integer-muldiv-matrix-"));
let romCount = 0;
try {
  for (const profile of profiles) {
    for (let offset = 0; offset < cases.length; offset += batchSize) {
      const batch = cases.slice(offset, offset + batchSize);
      const batchIndex = Math.floor(offset / batchSize);
      const sourcePath = join(temp, `${profile}-${batchIndex}.alexis`);
      const asmPath = join(temp, `${profile}-${batchIndex}.asm`);
      const romPath = join(temp, `${profile}-${batchIndex}.rom`);
      writeFileSync(sourcePath, generateBatch(batch, batchIndex), "utf8");
      const compiled = spawnSync(process.execPath, [
        join(root, "tools", "amyc.mjs"), sourcePath,
        "--asm", asmPath,
        "--rom", romPath,
        "--opt", profile
      ], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
      assert.equal(compiled.status, 0, `${profile} batch ${batchIndex} failed\n${compiled.stdout || ""}${compiled.stderr || ""}`);
      const asm = readFileSync(asmPath, "utf8");
      const core = await GearcolecoTestCore.create({ seed: 0x4D554C44 + batchIndex });
      try {
        core.loadBios(readFileSync(biosPath));
        core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
        for (let frame = 0; frame < 240; frame += 1) core.runFrame();
        assert.equal(readWord(core, addressOf(asm, "Failures")), 0, `${profile} batch ${batchIndex}: arithmetic mismatch`);
        assert.equal(readWord(core, addressOf(asm, "Completed")), batch.length, `${profile} batch ${batchIndex}: did not complete`);
      } finally {
        core.destroy();
      }
      romCount += 1;
    }
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log(`Integer mul/div matrix: PASS (${cases.length} operand pairs, ${cases.length * 4} assertions, ${romCount} ROMs, profiles: ${profiles.join(", ")})`);
