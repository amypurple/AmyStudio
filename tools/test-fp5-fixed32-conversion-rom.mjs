#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const expected = {
  PositiveFp5: [0x00, 0x00, 0x00, 0x40, 0x81],
  NegativeFp5: [0x00, 0x00, 0x00, 0x90, 0x82],
  PositiveBack: [0x00, 0x80, 0x01, 0x00],
  NegativeBack: [0x00, 0xC0, 0xFD, 0xFF]
};
const temp = await mkdtemp(join(tmpdir(), "amy-fp5-fixed32-"));

function compile(source, asm, rom, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`compile failed: ${profile}\n${output}`)));
  });
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${name}`);
  return Number.parseInt(match[1], 16);
}

async function assertCompileFails(name, body) {
  const source = join(temp, `${name}.alexis`);
  await writeFile(source, `project "FP5 CONVERSION REJECTION"\n${body}\nloop forever\n`);
  await assert.rejects(
    compile(source, join(temp, `${name}.asm`), join(temp, `${name}.rom`), "balanced"),
    /compile failed/
  );
}

try {
  const source = join(temp, "conversion.alexis");
  await writeFile(source, `project "FP5 FIXED32 CONVERSION ROM"
memory "colecovision_legacy_sdcc"
u8 GuardBefore = 77
fixed32 PositiveSource = 1.5
fixed32 NegativeSource = -2.25
fp5 PositiveFp5 = 0
fp5 NegativeFp5 = 0
fixed32 PositiveBack = 0
fixed32 NegativeBack = 0
u8 GuardAfter = 88
PositiveFp5 = PositiveSource
NegativeFp5 = NegativeSource
PositiveBack = PositiveFp5
NegativeBack = NegativeFp5
loop forever
`);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `conversion-${profile}.asm`);
    const romPath = join(temp, `conversion-${profile}.rom`);
    await compile(source, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const core = await GearcolecoTestCore.create({ seed: 0x46354658 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "GuardBefore"), 1)[0], 77, `${profile}: guard before`);
      assert.equal(core.readRam(addressOf(asm, "GuardAfter"), 1)[0], 88, `${profile}: guard after`);
      for (const [name, bytes] of Object.entries(expected)) {
        assert.deepEqual([...core.readRam(addressOf(asm, name), bytes.length)], bytes, `${profile}: ${name}`);
      }
    } finally {
      core.destroy();
    }
  }
  await assertCompileFails("fp5-to-u16", "fp5 Source = 1.5\nu16 Target = 0\nTarget = Source");
  await assertCompileFails("mixed-expression", "fp5 Left = 1.5\nfixed32 Right = 2.25\nfp5 Result = 0\nResult = Left + Right");
  console.log(`fp5/fixed32 conversion ROM: PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
