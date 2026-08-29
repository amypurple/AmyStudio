#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `project "BCD FP5 FORMAT ROM TEST"
memory "colecovision_legacy_sdcc"
record HudMemory:
  bcd digits 4 Score
end record
u8 GuardBefore = 77
bcd digits 1 Digit = 9
bcd digits 4 Wrapped = 9999
bcd digits 4 Clamped = 2
bcd digits 5 Odd = 12345
bcd digits 12 Maximum = 999999999999
u8 DigitText[1]
u8 WrappedText[4]
u8 ClampedText[4]
u8 OddText[5]
u8 MaximumText[12]
HudMemory Hud
u8 HudText[4]
fp5 Zero = 0
fp5 Positive = 1.5
fp5 Negative = -2.25
u8 ZeroText[16]
u8 PositiveText[16]
u8 NegativeText[16]
u8 GuardAfter = 88

Wrapped += 1
Clamped -= 3
format Digit into DigitText
format Wrapped into WrappedText
format Clamped into ClampedText
format Odd into OddText
format Maximum into MaximumText
Hud.Score = 6789
format Hud.Score into HudText
ZeroText = str$(Zero)
PositiveText = str$(Positive)
NegativeText = str$(Negative)
loop forever
`;

function compile(sourcePath, asmPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    let output = "";
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
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

function ascii(text) {
  return [...Buffer.from(text, "ascii")];
}

const expected = {
  GuardBefore: [77],
  Digit: [0x09],
  Wrapped: [0x00, 0x00],
  Clamped: [0x00, 0x00],
  Odd: [0x45, 0x23, 0x01],
  Maximum: [0x99, 0x99, 0x99, 0x99, 0x99, 0x99],
  DigitText: ascii("9"),
  WrappedText: ascii("0000"),
  ClampedText: ascii("0000"),
  OddText: ascii("12345"),
  MaximumText: ascii("999999999999"),
  HudText: ascii("6789"),
  GuardAfter: [88]
};

const temp = await mkdtemp(join(tmpdir(), "amy-bcd-fp5-format-"));
try {
  const sourcePath = join(temp, "test.alexis");
  await writeFile(sourcePath, source);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  let fp5TextBaseline = null;
  for (const profile of profiles) {
    const asmPath = join(temp, `test-${profile}.asm`);
    const romPath = join(temp, `test-${profile}.rom`);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const core = await GearcolecoTestCore.create({ seed: 0x42463546 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      for (const [name, bytes] of Object.entries(expected)) {
        assert.deepEqual([...core.readRam(addressOf(asm, name), bytes.length)], bytes, `${profile}: ${name}`);
      }
      const fp5Text = ["ZeroText", "PositiveText", "NegativeText"].map((name) => (
        [...core.readRam(addressOf(asm, name), 16)]
      ));
      if (!fp5TextBaseline) fp5TextBaseline = fp5Text;
      else assert.deepEqual(fp5Text, fp5TextBaseline, `${profile}: fp5 text differs from Off`);
    } finally {
      core.destroy();
    }
  }
  assert.deepEqual(fp5TextBaseline[0], ascii("0               "), "fp5 zero text");
  assert.deepEqual(fp5TextBaseline[1], ascii("1.5             "), "fp5 positive text");
  assert.deepEqual(fp5TextBaseline[2], ascii("-2.25           "), "fp5 negative text");
  console.log(`BCD/fp5 format ROM self-test PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
