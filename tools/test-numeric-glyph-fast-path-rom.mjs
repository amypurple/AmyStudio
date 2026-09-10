#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const bios = readFileSync(process.env.AMY_COLECO_BIOS || join(root, "studio", "bios", "colecovision.rom"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-numeric-glyphs-"));

const cases = [
  {
    name: "default",
    setup: "",
    expected: [0x30, 0x30, 0x30, 0x30, 0x37, 0x20, 0x20, 0x20, 0x20, 0x37],
    forbiddenAsm: "AMY_NUMERIC_DIGIT_BASE EQU"
  },
  {
    name: "custom",
    setup: "  set number digits to $80\n  set number pad to $7F",
    expected: [0x80, 0x80, 0x80, 0x80, 0x87, 0x7F, 0x7F, 0x7F, 0x7F, 0x87],
    requiredAsm: "AMY_NUMERIC_DIGIT_BASE EQU"
  }
];

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  for (const testCase of cases) {
    const source = join(temp, `${testCase.name}.alexis`);
    writeFileSync(source, `
u8 Value = 7
u8 Digits[5]
u8 Width[5]

sub start:
${testCase.setup}
  format Value into Digits digits 5
  format Value into Width width 5
  loop forever
end sub
`, "utf8");

    for (const profile of profiles) {
      const asmPath = join(temp, `${testCase.name}-${profile}.asm`);
      const romPath = join(temp, `${testCase.name}-${profile}.rom`);
      const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024
      });
      assert.equal(result.status, 0, `${testCase.name}/${profile}: ${result.stdout || ""}${result.stderr || ""}`);
      const asm = readFileSync(asmPath, "utf8");
      if (testCase.forbiddenAsm) assert.ok(!asm.includes(testCase.forbiddenAsm), `${testCase.name}/${profile}: default path reserved glyph RAM`);
      if (testCase.requiredAsm) assert.ok(asm.includes(testCase.requiredAsm), `${testCase.name}/${profile}: custom path omitted glyph RAM`);

      const core = await GearcolecoTestCore.create({ seed: 0x4E554D });
      try {
        core.loadBios(bios);
        core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
        for (let frame = 0; frame < 4; frame += 1) core.runFrame();
        assert.deepEqual([...core.readRam(addressOf(asm, "AMY_UVAR_Digits"), 10)], testCase.expected, `${testCase.name}/${profile}: formatted bytes`);
      } finally {
        core.destroy();
      }
    }
  }
  console.log(`Numeric glyph fast path ROM: PASS (${cases.length} cases x ${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
