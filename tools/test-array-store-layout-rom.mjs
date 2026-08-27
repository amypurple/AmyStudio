#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["off", "safe", "balanced", "aggressive", "experimental"];

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

const cases = [
  {
    name: "constant-index",
    globals: "",
    statements: `Board[40] = 9
  Board[0] = 3
  Board[63] = 7
  R40 = Board[40]`
  },
  {
    name: "variable-index",
    globals: "\nu8 KK = 0",
    statements: `KK = 40
  Board[KK] = 9
  Board[0] = 3
  Board[63] = 7
  R40 = Board[KK]`
  },
  {
    name: "expression-index",
    globals: "\nu8 KK = 0",
    statements: `KK = 39
  Board[KK + 1] = 9
  Board[0] = 3
  Board[63] = 7
  R40 = Board[KK + 1]`
  }
];

function buildSource(testCase) {
  return `project "ARRAY STORE LAYOUT ${testCase.name}"
u8 Board[64] = 0
u8 R40 = 0
u8 R0 = 0
u8 R63 = 0${testCase.globals}
${testCase.statements}
R0 = Board[0]
R63 = Board[63]
loop forever
`;
}

const outputDir = await mkdtemp(join(tmpdir(), "amy-array-layout-"));
try {
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    for (const testCase of cases) {
      const stem = join(outputDir, `${testCase.name}-${profile}`);
      const sourcePath = `${stem}.alexis`;
      const asmPath = `${stem}.asm`;
      const romPath = `${stem}.rom`;
      await writeFile(sourcePath, buildSource(testCase));
      await compile(sourcePath, asmPath, romPath, profile);
      const [asm, romOriginal] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
      const rom = Buffer.from(romOriginal);
      rom[0] = 0x55;
      rom[1] = 0xaa;

      const expected = { R40: 9, R0: 3, R63: 7 };
      const core = await GearcolecoTestCore.create({ seed: 0x41525259 });
      try {
        core.loadBios(bios);
        core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
        for (let frame = 0; frame < 5; frame += 1) core.runFrame();
        for (const [name, value] of Object.entries(expected)) {
          const address = symbolAddress(asm, name);
          assert.equal(core.readRam(address, 1)[0], value, `${profile}/${testCase.name}/${name} at $${address.toString(16)}`);
        }
      } finally {
        core.destroy();
      }
    }
  }
  console.log(`Array-store layout ROM self-test PASS (${cases.length} layouts x ${profiles.length} profiles)`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
