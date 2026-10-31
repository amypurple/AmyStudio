#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_INPUT, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-bug-hunt-20261031-"));
const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));

function build(id, sourceText, profile, expectSuccess = true) {
  const source = join(temp, `${id}.alexis`);
  const asmPath = join(temp, `${id}-${profile}.asm`);
  const romPath = join(temp, `${id}-${profile}.rom`);
  writeFileSync(source, sourceText);
  const result = spawnSync(process.execPath, [
    resolve(root, "tools/amyc.mjs"), source,
    "--asm", asmPath,
    "--rom", romPath,
    "--opt", profile
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (!expectSuccess) return result;
  assert.equal(result.status, 0, `${id}/${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
  return { asm: readFileSync(asmPath, "utf8"), rom: readFileSync(romPath) };
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

async function run(artifact, frames = 30) {
  const core = await GearcolecoTestCore.create({ seed: 0x31102026 });
  core.loadBios(bios);
  core.loadRom(artifact.rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < frames; frame += 1) core.runFrame();
  return core;
}

const callSource = `
u8 Arr[6]
u8 K = 3
u8 J = 1
u8 P = 7
u8 R1 = 0
u8 R2 = 0
u8 R3 = 0
Arr[3] = 40
Arr[1] = 7
R1 = Twice(Arr[K]) + Arr[J]
R2 = Twice(K) + Arr[J]
R3 = Twice(K) - P
loop forever
function Twice(u8 X) as u8
  return X + X
`;

const narrowSource = `
u8 A = 200
u8 B = 100
u8 Va = 128
u8 Vb = 7
u8 Q1 = 0
u8 Q2 = 0
u8 Q3 = 0
u8 Q4 = 0
Q1 = (A + B) / 2
Q2 = (A + B) >> 1
Q3 = (10 * Va) >> 7
Q4 = (32767 - Vb) >> 3
loop forever
`;

const vramSource = `
u16 N = 0
u8 Z = 0
u8 Buf[4]
text screen
fill $41 count 768 to vram.name
N = 0
fill $42 count N to vram.name + 64
Z = 0
fill $43 count Z to vram.name + 64
copy Buf count N to vram.name + 64
loop forever
`;

const randomSource = `
u8 K = 0
u8 R = 0
u8 Bound = 7
u8 R2 = 0
u8 Low = 11
u8 High = 11
u8 R3 = 0
nmi on
for K = 0 to 19
  R = random(3, 3)
  R2 = random(Bound, Bound)
  R3 = random(Low, High)
next
loop forever
`;

const compareSource = `
u8 A = 200
u16 W = 40000
u8 R1 = 0
u8 R2 = 0
u8 R3 = 0
u8 R4 = 0
if A > -1 then R1 = 1
if W > -1 then R2 = 1
if W <> -25536 then R3 = 1
if A <> -56 then R4 = 1
loop forever
`;

const printSource = `
text screen
print at 30,23, "ABCD"
loop forever
`;

const pauseSource = `
u8 Fin = 0
text screen
nmi off
Fin = 1
pause until press and release
Fin = 77
loop forever
`;

try {
  for (const profile of profiles) {
    const calls = build("call-clobber", callSource, profile);
    let core = await run(calls);
    try {
      assert.deepEqual([...core.readRam(addressOf(calls.asm, "R1"), 3)], [87, 13, 255], `${profile}: call operands`);
    } finally { core.destroy(); }

    const narrow = build("narrow-intermediate", narrowSource, profile);
    core = await run(narrow);
    try {
      assert.deepEqual([...core.readRam(addressOf(narrow.asm, "Q1"), 4)], [150, 150, 10, 255], `${profile}: widened intermediates`);
    } finally { core.destroy(); }

    const vram = build("zero-vram-count", vramSource, profile);
    core = await run(vram);
    try {
      assert.ok([...core.readVram(0x1800, 768)].every((value) => value === 0x41), `${profile}: zero VRAM count changed NAME table`);
    } finally { core.destroy(); }

    const random = build("equal-random-bounds", randomSource, profile);
    core = await run(random);
    try {
      assert.equal(core.readRam(addressOf(random.asm, "K"), 1)[0], 20, `${profile}: random equal bounds hung`);
      assert.equal(core.readRam(addressOf(random.asm, "R"), 1)[0], 3, `${profile}: random equal bounds result`);
      assert.equal(core.readRam(addressOf(random.asm, "R2"), 1)[0], 7, `${profile}: dynamic equal bounds result`);
      assert.equal(core.readRam(addressOf(random.asm, "R3"), 1)[0], 11, `${profile}: separately named equal bounds result`);
    } finally { core.destroy(); }

    const compare = build("unsigned-negative", compareSource, profile);
    core = await run(compare);
    try {
      assert.deepEqual([...core.readRam(addressOf(compare.asm, "R1"), 4)], [1, 1, 1, 1], `${profile}: unsigned/negative comparisons`);
    } finally { core.destroy(); }

    const printed = build("print-past-end", printSource, profile);
    core = await run(printed);
    try {
      const sat = [...core.readVram(0x1B00, 2)];
      assert.notDeepEqual(sat, ["C".charCodeAt(0), "D".charCodeAt(0)], `${profile}: print corrupted SAT`);
      assert.deepEqual([...core.readVram(0x1AFE, 2)], ["A".charCodeAt(0), "B".charCodeAt(0)], `${profile}: clipped print prefix`);
    } finally { core.destroy(); }

    const paused = build("pause-nmi-off", pauseSource, profile);
    core = await GearcolecoTestCore.create({ seed: 0x31102026 });
    try {
      core.loadBios(bios);
      core.loadRom(paused.rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 5; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(paused.asm, "Fin"), 1)[0], 1, `${profile}: NMI-off pause entry`);
      core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
      for (let frame = 0; frame < 5; frame += 1) core.runFrame();
      core.setControllerMask(0, 0);
      for (let frame = 0; frame < 5; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(paused.asm, "Fin"), 1)[0], 77, `${profile}: NMI-off pause did not return`);
    } finally { core.destroy(); }
  }
  console.log(`2026-10-31 bug hunt regressions: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
