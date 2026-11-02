#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const biosPath = process.env.AMY_COLECO_BIOS || join(root, "studio", "bios", "colecovision.rom");
if (!existsSync(biosPath)) {
  console.log("SKIP Ahoy reported regressions: ColecoVision BIOS not configured (set AMY_COLECO_BIOS).");
  process.exit(0);
}
const temp = mkdtempSync(join(tmpdir(), "amy-ahoy-regressions-"));
const bios = readFileSync(biosPath);

function build(id, source, profile) {
  const sourcePath = join(temp, `${id}.alexis`);
  const asmPath = join(temp, `${id}-${profile}.asm`);
  const romPath = join(temp, `${id}-${profile}.rom`);
  writeFileSync(sourcePath, source);
  const result = spawnSync(process.execPath, [
    join(root, "tools", "amyc.mjs"), sourcePath,
    "--asm", asmPath, "--rom", romPath, "--opt", profile
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, `${id}/${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
  return { asm: readFileSync(asmPath, "utf8"), rom: readFileSync(romPath) };
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing RAM address for ${name}`);
  return Number.parseInt(match[1], 16);
}

async function start(artifact, frames = 45) {
  const core = await GearcolecoTestCore.create({ seed: 0xA4012026 });
  core.loadBios(bios);
  core.loadRom(artifact.rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < frames; frame += 1) core.runFrame();
  return core;
}

function ascii(core, row, column, length) {
  return String.fromCharCode(...core.readVram(0x1800 + row * 32 + column, length));
}

const bcdSource = `
record Obj:
  u8 Pad
  u8 Pad2
  u8 Pad3
  u8 Pad4
  u8 Pad5
  bcd digits 6 Score
end record
Obj Os[2]
bcd digits 7 Values[2]
bcd digits 7 Displayed
bcd digits 6 Display6
u8 I = 1
sub AddTen(ref Obj O):
  O.Score += 10
  return
end sub
tile screen
Values[I] += 60
Values[I] += 60
Displayed = Values[I]
print Displayed at 2,1
Os[1].Score += 25
Os[1].Score += 80
Display6 = Os[1].Score
print Display6 at 2,2
for I = 1 to 12
  AddTen(Os[0])
next
Display6 = Os[0].Score
print Display6 at 2,3
print Values[1] at 2,4
screen on
loop forever
`;

const printSource = `
record Obj:
  u8 Pad
  bcd digits 6 Score
end record
Obj Os[2]
data Xs bytes 5,9
data Ys bytes 7,12
u8 I = 0
u8 A = 1
u8 B = 23
u8 C = 4
tile screen
Os[0].Score = 20
Os[1].Score = 30
print Os[0].Score at 5,1
print Os[1].Score at 21,2
print at 2,3, digits$(A, 2) + ":" + digits$(B, 2) + "." + digits$(C, 1)
for I = 0 to 1
  if I = 0 then
    print at Xs[I],Ys[I], "AB"
  else
    print at Xs[I],Ys[I], "CD"
  end if
next
screen on
loop forever
`;

const mixedBcdCompareSource = `
bcd digits 6 Score = 200
bcd digits 2 Secs = 39
u8 Greater = 0
u8 Reverse = 0
tile screen
if Score > Secs then Greater = 1
if Secs < Score then Reverse = 1
print Greater at 2,2
print Reverse at 3,2
screen on
loop forever
`;

const functionGotoLoopSource = `
u8 Result = 0
Result = PickFive
loop forever
function PickFive as u8
  u8 Q = 0
PickAgain:
  inc Q
  if Q = 5 then return Q
  goto PickAgain
  return 0
`;

const expressionSource = `
const Funeral = 12495
u8 V = 9
u8 K = 3
u8 R1 = 0
u8 R2 = 0
u16 W = $1234
u8 M = $0F
u8 Lo = 0
u8 Hi = 0
u8 Shifted = 0
u32 Wide = 0
if Twice(K) > V then R1 = 1
if Twice(K) < V then R2 = 1
Lo = lowbyte W & M
Hi = highbyte W + 1
Shifted = 1 << (K - 1)
Wide = Funeral
loop forever
function Twice(u8 X) as u8
  u8 Q = 0
  Q = X % 7
  return Q + Q
`;

const mainFrameSource = `
u8 N = 3
u8 I = 0
u8 Cnt = 0
u8 Done = 0
tile screen
for I = 0 to N - 1
  inc Cnt
next
print at 2,2, "AB"
screen on
Done = 77
loop forever
`;

const waitSource = `
u8 Fin = 0
text screen
screen on
nmi on
Fin = 1
wait fire
wait 20 frames
nmi off
Fin = 2
wait no fire
Fin = 77
loop forever
`;

const localArrayFillSource = `
u8 FillValue = 37
u8 Result = 0
Result = FillLocal(FillValue)
loop forever
function FillLocal(u8 Value) as u8
  u8 Cells[8]
  fill array Cells with Value
  return Cells[0] + Cells[7]
`;

const functionIndexTargetSource = `
u8 Board[8]
u8 Result = 0
Board[Twice(3)] = 9
Result = Board[6]
loop forever
function Twice(u8 Value) as u8
  return Value + Value
`;

const functionDivisionSource = `
u8 Result = 0
u8 Done = 0
function Pick(u8 Value) as u8
  return Value - 1
Result = 3 + Pick(4) / 3
Done = 1
loop forever
`;

const wideNamedConstantSource = `
const Funeral = 12495
const Small = 5
u32 Fe = 12495
i32 Q = 5
Fe = Fe + 12495
Fe = Fe - 12495
Fe = Fe + Funeral
Q = Q + Small
loop forever
`;

const wordTableU16IndexSource = `
u16 W = 0
u16 J = 1
W = Tab[J]
loop forever
data Tab words 100,300,500
`;

const bcdLongLoopSource = `
bcd digits 7 S[2]
u8 P = 1
u8 V = 98
S[P] += V
S[1] += V
loop forever
`;

try {
  for (const profile of profiles) {
    let artifact = build("bcd-addressing", bcdSource, profile);
    let core = await start(artifact);
    try {
      assert.equal(ascii(core, 1, 2, 7), "0000120", `${profile}: BCD array carry`);
      assert.equal(ascii(core, 2, 2, 6), "000105", `${profile}: record-array BCD carry and print`);
      assert.equal(ascii(core, 3, 2, 6), "000120", `${profile}: ref-field BCD carry`);
      assert.equal(ascii(core, 4, 2, 7), "0000120", `${profile}: variable-index BCD print`);
    } finally { core.destroy(); }

    artifact = build("formatted-print", printSource, profile);
    core = await start(artifact);
    try {
      assert.equal(ascii(core, 1, 5, 6), "000020", `${profile}: record-array BCD print 0`);
      assert.equal(ascii(core, 2, 21, 6), "000030", `${profile}: record-array BCD print 1`);
      assert.equal(ascii(core, 3, 2, 7), "01:23.4", `${profile}: chained digits$ print`);
      assert.equal(ascii(core, 7, 5, 2), "AB", `${profile}: indexed print coordinates 0`);
      assert.equal(ascii(core, 12, 9, 2), "CD", `${profile}: indexed print coordinates 1`);
    } finally { core.destroy(); }

    artifact = build("mixed-bcd-compare", mixedBcdCompareSource, profile);
    core = await start(artifact);
    try {
      assert.equal(core.readRam(addressOf(artifact.asm, "Greater"), 1)[0], 1, `${profile}: wide BCD > narrow BCD`);
      assert.equal(core.readRam(addressOf(artifact.asm, "Reverse"), 1)[0], 1, `${profile}: narrow BCD < wide BCD`);
    } finally { core.destroy(); }

    artifact = build("function-goto-loop", functionGotoLoopSource, profile);
    core = await start(artifact);
    try {
      assert.equal(core.readRam(addressOf(artifact.asm, "Result"), 1)[0], 5, `${profile}: function loop with terminal goto`);
    } finally { core.destroy(); }

    artifact = build("nested-expressions", expressionSource, profile);
    core = await start(artifact);
    try {
      assert.equal(core.readRam(addressOf(artifact.asm, "R1"), 1)[0], 0, `${profile}: call comparison >`);
      assert.equal(core.readRam(addressOf(artifact.asm, "R2"), 1)[0], 1, `${profile}: call comparison <`);
      assert.equal(core.readRam(addressOf(artifact.asm, "Lo"), 1)[0], 4, `${profile}: lowbyte expression`);
      assert.equal(core.readRam(addressOf(artifact.asm, "Hi"), 1)[0], 19, `${profile}: highbyte expression`);
      assert.equal(core.readRam(addressOf(artifact.asm, "Shifted"), 1)[0], 4, `${profile}: shift by expression`);
      assert.deepEqual([...core.readRam(addressOf(artifact.asm, "Wide"), 4)], [0xCF, 0x30, 0, 0], `${profile}: named const to u32`);
    } finally { core.destroy(); }

    artifact = build("main-frame", mainFrameSource, profile);
    core = await start(artifact);
    try {
      assert.equal(core.readRam(addressOf(artifact.asm, "Done"), 1)[0], 77, `${profile}: main FOR completed`);
      assert.equal(core.readRam(addressOf(artifact.asm, "Cnt"), 1)[0], 3, `${profile}: main FOR count`);
      assert.equal(ascii(core, 2, 2, 2), "AB", `${profile}: OS7 NAME shadow preserved`);
    } finally { core.destroy(); }

    artifact = build("wait-no-fire", waitSource, profile);
    core = await GearcolecoTestCore.create({ seed: 0xA4012026 });
    try {
      core.loadBios(bios);
      core.loadRom(artifact.rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      core.setControllerMask(0, 0);
      for (let frame = 0; frame < 35; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(artifact.asm, "Fin"), 1)[0], 77, `${profile}: wait no fire with NMI off`);
    } finally { core.destroy(); }

    artifact = build("local-array-fill", localArrayFillSource, profile);
    core = await start(artifact);
    try {
      assert.equal(core.readRam(addressOf(artifact.asm, "Result"), 1)[0], 74, `${profile}: local array fill preserves value`);
    } finally { core.destroy(); }

    artifact = build("function-index-target", functionIndexTargetSource, profile);
    core = await start(artifact);
    try {
      assert.equal(core.readRam(addressOf(artifact.asm, "Result"), 1)[0], 9, `${profile}: function index preserves stored byte`);
    } finally { core.destroy(); }

    artifact = build("function-division", functionDivisionSource, profile);
    core = await start(artifact);
    try {
      assert.equal(core.readRam(addressOf(artifact.asm, "Result"), 1)[0], 4, `${profile}: function-call division preserves divisor`);
      assert.equal(core.readRam(addressOf(artifact.asm, "Done"), 1)[0], 1, `${profile}: function-call division completes`);
    } finally { core.destroy(); }

    artifact = build("wide-named-constant", wideNamedConstantSource, profile);
    core = await start(artifact);
    try {
      assert.deepEqual([...core.readRam(addressOf(artifact.asm, "Fe"), 4)], [0x9E, 0x61, 0, 0], `${profile}: u32 named constant add`);
      assert.deepEqual([...core.readRam(addressOf(artifact.asm, "Q"), 4)], [10, 0, 0, 0], `${profile}: i32 named constant add`);
    } finally { core.destroy(); }

    artifact = build("word-table-u16-index", wordTableU16IndexSource, profile);
    core = await start(artifact);
    try {
      assert.deepEqual([...core.readRam(addressOf(artifact.asm, "W"), 2)], [0x2C, 0x01], `${profile}: word table u16 index`);
    } finally { core.destroy(); }

    artifact = build("bcd-long-loop", bcdLongLoopSource, profile);
    core = await start(artifact);
    core.destroy();
  }
  console.log(`Ahoy reported regressions: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
