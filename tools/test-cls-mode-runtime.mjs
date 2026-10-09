#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-cls-mode-runtime-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const cases = [
  {
    name: "text-direct",
    expected: 0x20,
    source: `sub ClearScene:\n  cls\nend sub\ntext screen\nClearScene()\nloop forever\n`
  },
  {
    name: "tile-direct",
    expected: 0x00,
    source: `sub ClearScene:\n  cls\nend sub\ntile screen\nClearScene()\nloop forever\n`
  },
  {
    name: "tile-transitive",
    expected: 0x00,
    source: `sub ClearLeaf:\n  cls\nend sub\nsub ClearScene:\n  ClearLeaf()\nend sub\ntile screen\nClearScene()\nloop forever\n`
  },
  {
    name: "explicit-shared",
    expected: 0x07,
    source: `u8 EmptyTile = 7\nsub ClearScene:\n  cls with EmptyTile\nend sub\ntext screen\nClearScene()\ntile screen\nClearScene()\nloop forever\n`
  }
];

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const testCase of cases) {
    const sourcePath = join(temp, `${testCase.name}.alexis`);
    writeFileSync(sourcePath, testCase.source);
    for (const profile of profiles) {
      const asmPath = join(temp, `${testCase.name}-${profile}.asm`);
      const romPath = join(temp, `${testCase.name}-${profile}.rom`);
      const result = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024
      });
      assert.equal(result.status, 0, `${testCase.name}/${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);

      const core = await GearcolecoTestCore.create({ seed: 0x434C5300 + testCase.expected });
      try {
        core.loadBios(bios);
        core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
        for (let frame = 0; frame < 120; frame += 1) core.runFrame();
        const nameBase = (core.getVdpRegisters()[2] & 0x0F) << 10;
        const nameTable = [...core.readVram(nameBase, 0x0300)];
        assert.equal(nameTable.length, 0x0300);
        assert.ok(nameTable.every((value) => value === testCase.expected),
          `${testCase.name}/${profile}: NAME table is not uniformly $${testCase.expected.toString(16).padStart(2, "0")}`);
      } finally {
        core.destroy();
      }
    }
  }
  console.log(`CLS mode runtime: PASS (${cases.length} cases x ${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
