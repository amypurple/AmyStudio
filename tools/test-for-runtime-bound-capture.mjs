#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-for-bound-"));
const sourceText = `project "FOR RUNTIME BOUND CAPTURE"
memory "colecovision_legacy_sdcc"
u8 V = 1
u8 X = 0
u8 ByteCount = 0
i8 SignedEnd = -1
i8 SignedI = 0
u8 SignedCount = 0
u16 WordEnd = 1
u16 WordI = 0
u8 WordCount = 0
i16 SignedWordEnd = -1
i16 SignedWordI = 0
u8 SignedWordCount = 0
u8 DynamicStep = 1
u8 StepCount = 0
u8 OuterEnd = 1
u8 InnerEnd = 1
u8 Outer = 0
u8 Inner = 0
u8 NestedCount = 0
u8 RecursiveResult = 0
u8 Passed = 0

function RecursiveLoop(u8 Depth) as u8
  u8 Index = 0
  u8 Limit = Depth
  u8 Total = 0
  for Index = 0 to Limit
    Limit = 5
    if Index = 0 and Depth > 0 then
      Total += RecursiveLoop(Depth - 1)
    end if
    Total += 1
  next Index
  return Total

for X = 0 to V
  V = 5
  ByteCount += 1
next
for SignedI = 1 downto SignedEnd
  SignedEnd = -5
  SignedCount += 1
next
for WordI = 0 to WordEnd
  WordEnd = 5
  WordCount += 1
next
for SignedWordI = 1 downto SignedWordEnd
  SignedWordEnd = -5
  SignedWordCount += 1
next
for X = 0 to 4 step DynamicStep
  DynamicStep = 2
  StepCount += 1
next
for Outer = 0 to OuterEnd
  OuterEnd = 5
  for Inner = 0 to InnerEnd
    InnerEnd = 5
    NestedCount += 1
  next Inner
next Outer
RecursiveResult = RecursiveLoop(2)
if ByteCount = 2 and SignedCount = 3 and WordCount = 2 and SignedWordCount = 3 and StepCount = 5 and NestedCount = 8 and RecursiveResult = 6 then
  Passed = 1
end if
loop forever
`;

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing RAM symbol ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const source = join(temp, `for-bound-${profile}.alexis`);
    const asm = join(temp, `for-bound-${profile}.asm`);
    const rom = join(temp, `for-bound-${profile}.rom`);
    writeFileSync(source, sourceText);
    const result = spawnSync(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile} should compile:\n${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const generated = readFileSync(asm, "utf8");
    assert.match(generated, /ld \(ix-2\),a/i, `${profile}: runtime bound should use the current activation frame`);
    assert.match(generated, /ld \(ix-4\),a/i, `${profile}: runtime step should use a separate frame slot`);
    assert.doesNotMatch(generated, /^AMY_FOR_(?:BOUND|STEP)_/m, `${profile}: runtime loop state must not use global RAM aliases`);

    const core = await GearcolecoTestCore.create({ seed: 0x464f5232 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_ByteCount"), 1)[0], 2, `${profile}: byte bound`);
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_SignedCount"), 1)[0], 3, `${profile}: signed byte bound`);
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_WordCount"), 1)[0], 2, `${profile}: word bound`);
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_SignedWordCount"), 1)[0], 3, `${profile}: signed word bound`);
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_StepCount"), 1)[0], 5, `${profile}: runtime step`);
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_NestedCount"), 1)[0], 8, `${profile}: nested bounds`);
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_RecursiveResult"), 1)[0], 6, `${profile}: recursive activation bound`);
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_Passed"), 1)[0], 1, `${profile}: aggregate result`);
    } finally {
      core.destroy();
    }
  }
  console.log("Runtime FOR bound and step capture PASS (5 profiles)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
