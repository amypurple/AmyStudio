#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `project "FIXED ARRAY ELEMENT ROM"
memory "colecovision_legacy_sdcc"
record FixedSet:
  fixed Signed[2]
  ufixed Unsigned[2]
end record
u8 GuardBefore = 77
fixed GlobalSigned[3] = 0
ufixed GlobalUnsigned[3] = 0
FixedSet StaticSet
overlay Work
  Part as FixedSet
  Other as FixedSet
end overlay
u8 DynamicIndex = 1
u8 GuardAfter = 88
ufixed UfxLeft = 255.5
ufixed UfxHalf = 0.5
ufixed UfxTwo = 2.0
ufixed UfxMulExpr = 0
ufixed UfxDivExpr = 0
ufixed UfxNestedExpr = 0
ufixed UfxArrayExpr = 0
ufixed UfxCallExpr = 0
ufixed UfxInlineCallExpr = 0
ufixed UfxRecursiveExpr = 0
fixed FxLeft = -12.5
fixed FxHalf = 0.5
fixed FxTwo = 2.0
fixed FxMulExpr = 0
fixed FxDivExpr = 0
fixed FxLiteralFunction = 0
fixed FxLiteralSub = 0
ufixed UfxLiteralFunction = 0
ufixed UfxLiteralSub = 0
fixed FxTripleExpr = 0
fixed FxTimesTenExpr = 0

sub FillLocal:
  fixed LocalSigned[2] = 0
  LocalSigned[DynamicIndex] = -3.25
  GlobalSigned[2] = LocalSigned[DynamicIndex]
end sub

function HalfUnsigned(ufixed Value) as ufixed
  return Value / 2.0

function HalfUnsignedInline(ufixed Value) as ufixed
  if Value > 0.0 then return Value / 2.0
  return 0.0

function QuarterRecursive(u8 Depth, ufixed Value) as ufixed
  if Depth = 0 then return Value
  return QuarterRecursive(Depth - 1, Value / 2.0)

function IdentityFixed(fixed Value) as fixed
  return Value

function IdentityUnsigned(ufixed Value) as ufixed
  return Value

function TripleFixed(fixed Value) as fixed
  return Value * 3.0

function TimesTenFixed(fixed Value) as fixed
  return Value * 10.0

sub StoreFixedLiteral(fixed Value):
  FxLiteralSub = Value
end sub

sub StoreUnsignedLiteral(ufixed Value):
  UfxLiteralSub = Value
end sub

GlobalSigned[0] = -1.5
GlobalSigned[DynamicIndex] = 12.75
GlobalUnsigned[0] = 255.5
GlobalUnsigned[DynamicIndex] = 0.25
GlobalUnsigned[2] = 200.0
StaticSet.Signed[DynamicIndex] = -7.5
StaticSet.Unsigned[0] = 42.125
Work.Part.Signed[0] = -2.0
Work.Part.Unsigned[DynamicIndex] = 3.5
FillLocal
GlobalSigned[0] += 0.5
GlobalUnsigned[0] /= 2.0
GlobalUnsigned[2] *= 0.5
StaticSet.Signed[DynamicIndex] *= 2.0
Work.Part.Unsigned[DynamicIndex] -= 0.5
UfxMulExpr = UfxLeft * UfxHalf
UfxDivExpr = UfxLeft / UfxTwo
UfxNestedExpr = (UfxLeft / UfxTwo) * UfxHalf
UfxArrayExpr = GlobalUnsigned[DynamicIndex] * StaticSet.Unsigned[0]
UfxCallExpr = HalfUnsigned(UfxLeft) * UfxHalf
UfxInlineCallExpr = HalfUnsignedInline(UfxLeft) * UfxHalf
UfxRecursiveExpr = QuarterRecursive(2, UfxLeft)
FxMulExpr = FxLeft * FxHalf
FxDivExpr = FxLeft / FxTwo
FxLiteralFunction = IdentityFixed(2.5)
StoreFixedLiteral(100.0)
UfxLiteralFunction = IdentityUnsigned(255.0)
StoreUnsignedLiteral(200.0)
FxTripleExpr = TripleFixed(10.5)
FxTimesTenExpr = TimesTenFixed(10.5)
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
  const match = asm.match(new RegExp(`^AMY_(?:UVAR|OVERLAY)_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${name}`);
  return Number.parseInt(match[1], 16);
}

function readWords(core, address, count) {
  const bytes = core.readRam(address, count * 2);
  return Array.from({ length: count }, (_, index) => bytes[index * 2] | (bytes[index * 2 + 1] << 8));
}

const temp = await mkdtemp(join(tmpdir(), "amy-fixed-array-element-"));
try {
  const sourcePath = join(temp, "test.alexis");
  await writeFile(sourcePath, source);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `test-${profile}.asm`);
    const romPath = join(temp, `test-${profile}.rom`);
    await compile(sourcePath, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const core = await GearcolecoTestCore.create({ seed: 0x46495841 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 6; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "GuardBefore"), 1)[0], 77, `${profile}: guard before`);
      assert.deepEqual(readWords(core, addressOf(asm, "GlobalSigned"), 3), [0xFF00, 0x0CC0, 0xFCC0], `${profile}: global signed`);
      assert.deepEqual(readWords(core, addressOf(asm, "GlobalUnsigned"), 3), [0x7FC0, 0x0040, 0x6400], `${profile}: global unsigned`);
      assert.deepEqual(readWords(core, addressOf(asm, "StaticSet"), 4), [0, 0xF100, 0x2A20, 0], `${profile}: record arrays`);
      assert.deepEqual(readWords(core, addressOf(asm, "Work"), 4), [0xFE00, 0, 0, 0x0300], `${profile}: overlay arrays`);
      assert.deepEqual(readWords(core, addressOf(asm, "UfxMulExpr"), 2), [0x7FC0, 0x7FC0], `${profile}: unsigned fixed expressions`);
      assert.deepEqual(readWords(core, addressOf(asm, "UfxNestedExpr"), 5), [0x3FE0, 0x0A88, 0x3FE0, 0x3FE0, 0x3FE0], `${profile}: nested, array, call, and recursive fixed expressions`);
      assert.deepEqual(readWords(core, addressOf(asm, "FxMulExpr"), 2), [0xF9C0, 0xF9C0], `${profile}: signed fixed expressions`);
      assert.deepEqual(readWords(core, addressOf(asm, "FxLiteralFunction"), 6), [0x0280, 0x6400, 0xFF00, 0xC800, 0x1F80, 0x6900], `${profile}: fixed literal calls and constant multiply return`);
      assert.equal(core.readRam(addressOf(asm, "GuardAfter"), 1)[0], 88, `${profile}: guard after`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Fixed array element ROM self-test PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
