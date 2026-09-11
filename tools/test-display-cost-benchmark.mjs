#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const ENTRY_MARKER = Uint8Array.from([0xf5, 0x3e, 0xca, 0xee, 0xfe, 0xee, 0xfe, 0xfe, 0xca, 0xf1]);
const EXIT_MARKER = Uint8Array.from([0xf5, 0x3e, 0xbe, 0xee, 0xef, 0xee, 0xef, 0xfe, 0xbe, 0xf1]);
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const cases = [
  { id: "baseline", expected: "" },
  { id: "literal-text", expected: "SCORE" },
  { id: "literal-one-character", expected: "A" },
  { id: "single-character", expected: "A" },
  { id: "put-char-variable-coordinates", expected: "A" },
  { id: "put-char-variable-value", expected: "A" },
  { id: "put-char-value-expression", expected: "A" },
  { id: "put-char-qualified-value", expected: "A" },
  { id: "put-char-expressions", expected: "A" },
  { id: "put-char-qualified", expected: "A" },
  { id: "variable-coordinates", expected: "SCORE" },
  { id: "print-u8", expected: "042" },
  { id: "print-u8-digits1", expected: "5" },
  { id: "print-u8-digits2", expected: "55" },
  { id: "print-u8-expression", expected: "55" },
  { id: "print-u8-qualified-digits", expected: "7" },
  { id: "print-u8-mixed-widths", expected: "5", extra: { address: 0x1800 + 9 * 32 + 5, expected: "55" } },
  {
    id: "print-u8-digits1-boundaries",
    checks: ["0", "9", "0", "9", "0", "5"].map((expected, index) => ({ address: 0x1800 + (6 + index) * 32 + 5, expected }))
  },
  {
    id: "print-u8-digits2-boundaries",
    checks: ["00", "09", "10", "99", "00", "55"].map((expected, index) => ({ address: 0x1800 + (6 + index) * 32 + 5, expected }))
  },
  { id: "print-fixed", expected: " 001.50" },
  { id: "print-u16", expected: "12345" },
  { id: "print-i16", expected: "-00321" },
  {
    id: "print-u16-short-widths",
    checks: ["5", "35", "535", "5535", "65535"].map((expected, index) => ({ address: 0x1800 + (6 + index) * 32 + 5, expected }))
  },
  {
    id: "print-i16-short-widths",
    checks: ["-8", "-68", "-768", "-2768", "-32768"].map((expected, index) => ({ address: 0x1800 + (6 + index) * 32 + 5, expected }))
  },
  {
    id: "print-i16-expression-qualified",
    checks: ["-00", "-99"].map((expected, index) => ({ address: 0x1800 + (8 + index) * 32 + 5, expected }))
  },
  { id: "print-bcd", expected: "1234" },
  { id: "hud-update", expected: "12345", address: 0x1800 + 3 * 32 + 2, extra: { address: 0x1800 + 3 * 32 + 20, expected: "003" } },
];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(root, "competition", "benchmarks", "display-cost");
const bios = fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom"));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-display-cost-"));
const results = [];

try {
  for (const profile of profiles) {
    for (const fixture of cases) {
      const asmPath = path.join(temp, `${fixture.id}-${profile}.asm`);
      const romPath = path.join(temp, `${fixture.id}-${profile}.rom`);
      const compile = spawnSync(process.execPath, [
        path.join(root, "tools", "amyc.mjs"), path.join(fixtureDir, `${fixture.id}.alexis`),
        "--asm", asmPath, "--rom", romPath, "--opt", profile,
      ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
      assert.equal(compile.status, 0, `${fixture.id}/${profile} compile failed:\n${compile.stdout}\n${compile.stderr}`);

      const asm = fs.readFileSync(asmPath, "utf8");
      if (fixture.id === "print-u8") {
        assert.match(asm, /^include "src\/alexis_lib\/coleco_math_format_u8\.asm"$/m, `${fixture.id}/${profile} omitted its formatter`);
        assert.doesNotMatch(asm, /^include "src\/alexis_lib\/coleco_math_format_u8_2\.asm"$/m, `${fixture.id}/${profile} linked an unused formatter`);
      }
      if (["print-u8-digits1", "print-u8-qualified-digits"].includes(fixture.id)) {
        assert.match(asm, /\bcall AMY_U8_TO_ASCII1_MOD\b/, `${fixture.id}/${profile} omitted its one-digit formatter`);
        assert.doesNotMatch(asm, /\bcall AMY_U8_TO_ASCII3\b/, `${fixture.id}/${profile} linked the three-digit formatter`);
      }
      if (fixture.id === "print-u8-digits1-boundaries") {
        assert.match(asm, /\bcall AMY_U8_TO_ASCII1_MOD\b/, `${fixture.id}/${profile} omitted its one-digit formatter`);
        assert.doesNotMatch(asm, /\bcall AMY_U8_TO_ASCII3\b/, `${fixture.id}/${profile} linked the three-digit formatter`);
      }
      if (["print-u8-digits2", "print-u8-expression"].includes(fixture.id)) {
        assert.match(asm, /\bcall AMY_U8_TO_ASCII2_MOD\b/, `${fixture.id}/${profile} omitted its two-digit formatter`);
        assert.doesNotMatch(asm, /\bcall AMY_U8_TO_ASCII3\b/, `${fixture.id}/${profile} linked the three-digit formatter`);
      }
      if (fixture.id === "print-u8-digits2-boundaries") {
        assert.match(asm, /\bcall AMY_U8_TO_ASCII2_MOD\b/, `${fixture.id}/${profile} omitted its two-digit formatter`);
        assert.doesNotMatch(asm, /\bcall AMY_U8_TO_ASCII3\b/, `${fixture.id}/${profile} linked the three-digit formatter`);
      }
      if (fixture.id === "print-u8-mixed-widths") {
        assert.match(asm, /\bcall AMY_U8_TO_ASCII3\b/, `${fixture.id}/${profile} omitted its consolidated formatter`);
        assert.doesNotMatch(asm, /\bcall AMY_U8_TO_ASCII[12]_MOD\b/, `${fixture.id}/${profile} retained duplicate narrow formatters`);
      }
      if (fixture.id === "print-fixed") {
        assert.match(asm, /^include "src\/alexis_lib\/coleco_math_format_u8\.asm"$/m, `${fixture.id}/${profile} omitted ASCII3`);
        assert.match(asm, /^include "src\/alexis_lib\/coleco_math_format_u8_2\.asm"$/m, `${fixture.id}/${profile} omitted ASCII2`);
      }
      if (fixture.id === "print-i16-short-widths") {
        assert.match(asm, /\bld a,\(AMY_BUFFER32\+5\)/, `${fixture.id}/${profile} omitted the direct one-byte copy`);
        assert.match(asm, /\bld hl,\(AMY_BUFFER32\+4\)/, `${fixture.id}/${profile} omitted the direct two-byte copy`);
      }
      if (fixture.id === "print-i16-expression-qualified") {
        assert.match(asm, /\bld hl,\(AMY_BUFFER32\+4\)/, `${fixture.id}/${profile} omitted the direct two-byte copy`);
      }
      if (["single-character", "put-char-variable-coordinates", "put-char-variable-value", "put-char-value-expression", "put-char-qualified-value", "put-char-expressions", "put-char-qualified"].includes(fixture.id)) {
        assert.match(asm, /\bcall AMY_PUT_CHAR_AT\b/, `${fixture.id}/${profile} omitted the general coordinate helper`);
      }

      const rom = fs.readFileSync(romPath);
      const entry = uniqueMarkerAddress(rom, ENTRY_MARKER) + ENTRY_MARKER.length;
      const exit = uniqueMarkerAddress(rom, EXIT_MARKER);
      const core = await GearcolecoTestCore.create({ seed: 0x44495350 });
      try {
        core.loadBios(bios);
        core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
        runToBreakpoint(core, entry, `${fixture.id}/${profile} entry`);
        let cycles = 0;
        if (entry !== exit) {
          const started = core.getMasterClockCycles();
          runToBreakpoint(core, exit, `${fixture.id}/${profile} exit`);
          cycles = core.getMasterClockCycles() - started;
        }
        if (fixture.expected) {
          assertVramText(core, fixture.address ?? 0x1800 + 8 * 32 + 5, fixture.expected, `${fixture.id}/${profile}`);
        }
        if (fixture.extra) assertVramText(core, fixture.extra.address, fixture.extra.expected, `${fixture.id}/${profile} extra`);
        for (const [index, check] of (fixture.checks || []).entries()) {
          assertVramText(core, check.address, check.expected, `${fixture.id}/${profile} check ${index + 1}`);
        }
        results.push({ fixture: fixture.id, profile, romBytes: rom.length, cycles });
      } finally {
        core.destroy();
      }
    }
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

for (const profile of profiles) {
  const baseline = results.find((row) => row.fixture === "baseline" && row.profile === profile);
  for (const row of results.filter((candidate) => candidate.profile === profile)) {
    row.romDelta = row.romBytes - baseline.romBytes;
    row.cycleDelta = row.cycles - baseline.cycles;
  }
}

fs.writeFileSync(path.join(fixtureDir, "display-cost-results.json"), JSON.stringify({ profiles, results }, null, 2) + "\n");
fs.writeFileSync(path.join(fixtureDir, "display-cost-results.csv"), [
  "Fixture,Profile,ROM bytes,ROM delta,Cycles,Cycle delta",
  ...results.map((row) => `${row.fixture},${row.profile},${row.romBytes},${row.romDelta},${row.cycles},${row.cycleDelta}`),
].join("\n") + "\n");

console.table(results.filter((row) => row.profile === "experimental"));
console.log(`Display-cost benchmark PASS (${cases.length} fixtures, ${profiles.length} profiles, ${results.length} ROM runs)`);

function uniqueMarkerAddress(rom, marker) {
  const matches = [];
  for (let offset = 0; offset <= rom.length - marker.length; offset += 1) {
    if (marker.every((value, index) => rom[offset + index] === value)) matches.push(0x8000 + offset);
  }
  assert.equal(matches.length, 1, `Expected one marker, found ${matches.length}`);
  return matches[0];
}

function runToBreakpoint(core, address, label) {
  core.clearAllBreakpoints();
  core.setExecuteBreakpoint(address);
  for (let frame = 0; frame < 8; frame += 1) {
    const result = core.runFrame();
    if (result.breakpointHit && result.pc === address) {
      core.clearAllBreakpoints();
      return;
    }
  }
  throw new Error(`${label} was not reached`);
}

function assertVramText(core, address, expected, label) {
  const actual = Buffer.from(core.readVram(address, expected.length)).toString("latin1");
  assert.equal(actual, expected, `${label} Name Table mismatch`);
}
