#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-div-zero-"));

function compile(name, source) {
  const sourcePath = join(temp, `${name}.alexis`);
  writeFileSync(sourcePath, `${source}\nloop forever\n`);
  return spawnSync(process.execPath, [
    "tools/amyc.mjs",
    sourcePath,
    "--asm", join(temp, `${name}.asm`),
    "--rom", join(temp, `${name}.rom`),
    "--opt", "balanced"
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}

function reject(name, source, expected) {
  const result = compile(name, source);
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  assert.notEqual(result.status, 0, `${name} unexpectedly compiled`);
  assert.match(output, expected, `${name} should report the precise zero-divisor diagnostic`);
}

try {
  reject("declaration-div", "u8 Result = 10 / 0", /division by zero/i);
  reject("assignment-mod", "u16 Result = 0\nResult = 100 % (2 - 2)", /modulo by zero/i);
  reject("compound-div", "u32 Result = 100\nResult \/= 0", /division by zero/i);
  reject("named-zero", "const Zero = 0\ni32 Result = 100 / Zero", /division by zero/i);
  reject("constant-definition", "const Broken = 8 % 0\nu8 Result = 0", /modulo by zero/i);

  const runtime = compile("runtime-zero", "u8 Divisor = 0\nu8 Quotient = 10 / Divisor\nu8 Remainder = 10 % Divisor");
  assert.equal(runtime.status, 0, `runtime zero divisor must remain fail-soft:\n${runtime.stdout || ""}${runtime.stderr || ""}`);
  console.log("divide/modulo by zero diagnostics PASS");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
