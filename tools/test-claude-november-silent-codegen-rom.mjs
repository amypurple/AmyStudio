#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = await readFile(resolve(root, "tools/fixtures/claude-november-silent-codegen.alexis"), "utf8");

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

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "mi"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

const output = await mkdtemp(join(tmpdir(), "amy-claude-silent-"));
try {
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const sourcePath = join(output, `${profile}.alexis`);
    const asmPath = join(output, `${profile}.asm`);
    const romPath = join(output, `${profile}.rom`);
    await writeFile(sourcePath, source);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const addresses = ["ReturnModulo", "ReturnSum", "ReturnLiteral", "SignedCompare"]
      .map((name) => addressOf(asm, `AMY_UVAR_${name}`));
    const spriteTable = addressOf(asm, "AMY_SPRITE_TABLE");
    rom[0] = 0x55;
    rom[1] = 0xaa;
    const core = await GearcolecoTestCore.create({ seed: 0x300 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 5; frame += 1) core.runFrame();
      assert.deepEqual(addresses.map((address) => core.readRam(address, 1)[0]), [15, 235, 15, 1], `${profile}: computed results`);
      assert.deepEqual([...core.readRam(spriteTable + 8, 4)], [100, 60, 0, 11], `${profile}: sprite arguments`);
    } finally {
      core.destroy();
    }
  }
  console.log("Claude November silent-codegen regressions PASS (5 profiles, runtime checked)");
} finally {
  await rm(output, { recursive: true, force: true });
}
