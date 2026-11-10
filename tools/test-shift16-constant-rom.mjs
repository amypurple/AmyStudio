#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const counts = [0, 1, 5, 8, 9, 15, 16];
const checks = [];
const source = ["u16 U = $A55A", "i16 S = -12345"];
for (const count of counts) {
  for (const [type, name, expression, expected] of [
    ["u16", `UL${count}`, `U << ${count}`, (0xA55A << count) & 0xFFFF],
    ["u16", `UR${count}`, `U >> ${count}`, 0xA55A >>> count],
    ["i16", `SR${count}`, `S >> ${count}`, (-12345 >> count) & 0xFFFF]
  ]) {
    source.push(`${type} ${name} = 0`);
    checks.push({ name, expression, expected });
  }
}
source.push("u8 Complete = 0", "", "sub start:");
for (const check of checks) source.push(`  ${check.name} = ${check.expression}`);
source.push("  Complete = 1", "  loop forever", "end sub", "");

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

const temp = mkdtempSync(join(tmpdir(), "amy-shift16-constant-"));
try {
  const sourcePath = join(temp, "shift16.alexis");
  writeFileSync(sourcePath, source.join("\n"), "utf8");
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${profile}: ${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.doesNotMatch(asm, /AMY_SHIFT16_LOOP/, `${profile}: constant shift retained a runtime loop`);
    const core = await GearcolecoTestCore.create({ seed: 0x53484946 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const complete = addressOf(asm, "AMY_UVAR_Complete");
      for (let frame = 0; frame < 120 && core.readRam(complete, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(complete, 1)[0], 1, `${profile}: ROM did not complete`);
      for (const check of checks) {
        const bytes = core.readRam(addressOf(asm, `AMY_UVAR_${check.name}`), 2);
        assert.equal(bytes[0] | (bytes[1] << 8), check.expected, `${profile}: ${check.expression}`);
      }
    } finally {
      core.destroy();
    }
  }
  console.log(`Constant 16-bit shifts: PASS (${checks.length} cases x ${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
