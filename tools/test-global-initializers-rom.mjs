#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = process.argv.slice(2).length ? process.argv.slice(2) : ["off", "safe", "balanced", "aggressive", "experimental"];
const cases = [
  {
    name: "single",
    source: `u8 X = 42\nu8 Result = 0\nResult = X\nloop forever\n`,
    expected: { X: 42, Result: 42 }
  },
  {
    name: "array-before-scalars",
    source: `u8 Board[64] = 0\nu8 CursorX = 3\nu8 CursorY = 5\nu8 ResultX = 0\nu8 ResultY = 0\nResultX = CursorX\nResultY = CursorY\nloop forever\n`,
    expected: { Board: 0, CursorX: 3, CursorY: 5, ResultX: 3, ResultY: 5 }
  },
  {
    name: "separated-values",
    source: `u8 Victim = 17\nu8 Pad[13] = 0\nu8 Aa = 42\nu8 Bb = 99\nu8 ResultA = 0\nu8 ResultB = 0\nResultA = Aa\nResultB = Bb\nloop forever\n`,
    expected: { Victim: 17, Pad: 0, Aa: 42, Bb: 99, ResultA: 42, ResultB: 99 }
  }
];

function compile(sourcePath, asmPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      stdio: "ignore"
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`compile failed: ${profile}`)));
  });
}

function symbolAddress(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "m"));
  assert.ok(match, `missing symbol ${name}`);
  return Number.parseInt(match[1], 16);
}

const outputDir = await mkdtemp(join(tmpdir(), "amy-global-init-"));
try {
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    for (const testCase of cases) {
      const stem = join(outputDir, `${testCase.name}-${profile}`);
      const sourcePath = `${stem}.alexis`;
      const asmPath = `${stem}.asm`;
      const romPath = `${stem}.rom`;
      await writeFile(sourcePath, `project "GLOBAL INIT ${testCase.name}"\n${testCase.source}`);
      await compile(sourcePath, asmPath, romPath, profile);
      const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
      rom[0] = 0x55;
      rom[1] = 0xaa;
      const core = await GearcolecoTestCore.create({ seed: 0x494e4954 });
      try {
        core.loadBios(bios);
        core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
        for (let frame = 0; frame < 5; frame += 1) core.runFrame();
        for (const [name, expected] of Object.entries(testCase.expected)) {
          const address = symbolAddress(asm, name);
          assert.equal(core.readRam(address, 1)[0], expected, `${profile}/${testCase.name}/${name} at $${address.toString(16)}`);
        }
      } finally {
        core.destroy();
      }
    }
  }
  console.log(`Global initializer ROM self-test PASS (${cases.length} layouts x ${profiles.length} profiles)`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
