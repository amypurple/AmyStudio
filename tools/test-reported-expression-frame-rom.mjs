#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-reported-expression-frame-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const big = Array(321).fill(0);
big[64] = 11;
big[320] = 77;

const source = join(temp, "reported-expression-frame.alexis");
writeFileSync(source, `project "REPORTED EXPRESSION FRAME"
memory "colecovision_legacy_sdcc"
const Ka = 36
const Kb = 19
const Sh = 4
u8 Sum = 0
u8 Si = 0
u8 N = 3
u8 Back = 0
u8 PickFlag = 0
u8 PickOne = 0
u8 PickTwo = 0
u8 Arr[4]
u16 Product = 3
u16 Shifted = 2
u16 Wide = 384
u8 NarrowArg = 0
u8 NarrowRet = 0
u8 NarrowWideRet = 0
i16 SignedPos = 5
u8 BytePos = 3
u8 CompareOne = 0
u8 CompareTwo = 0
bool Hit = false
u8 BoolResult = 0
u16 VramOffset = 66
u8 VpokeRead = 0
u8 Row = 10
u8 CopyRead = 0
u8 CopyAt10 = 0
u8 CopyAt2 = 0
u8 Done = 0
data Big bytes = ${big.join(",")}
data One bytes = 66

sub Early(u8 Quit):
  if Quit = 1 then return
  for Si = 1 to N
    Sum = Sum + Si
  next
  return
end sub

function Pick(u8 Which) as u8
  if PickFlag = 0 then return 1
  if Arr[Which] = 7 then return 0
  return 1

sub Keep(u8 Value):
  NarrowArg = Value
  return
end sub

function Low(u8 Value) as u8
  return Value

function ReturnWide() as u8
  return Wide

function Tile(u8 Value, u8 Red) as u8
  return 65 + Value + Red

  tile screen
  nmi off
  Arr[2] = 7
  call asm Nothing
  Early(1)
  Back = 1
  Early(0)
  PickOne = Pick(2)
  PickFlag = 1
  PickTwo = Pick(2)
  Product = Product * Ka + Kb
  Shifted = Shifted << Sh
  Keep(Wide)
  NarrowRet = Low(Wide - 200)
  NarrowWideRet = ReturnWide()
  if SignedPos > BytePos + 6 then CompareOne = 1
  if SignedPos + 4 < BytePos then CompareTwo = 1
  Hit = SignedPos > 4
  if Hit then BoolResult = BoolResult + 1
  Hit = SignedPos < 4
  if not Hit then BoolResult = BoolResult + 2
  vpoke vram.name + VramOffset, Tile(3, 0)
  vpeek vram.name + VramOffset into VpokeRead
  copy Big + Row * 32 count 1 to vram.name
  CopyRead = get char at 0,0
  copy One count 1 to vram.name + Row * 32 + 5
  CopyAt10 = get char at 5,10
  CopyAt2 = get char at 5,2
  Done = 77
  loop forever

asm {
Nothing:
    ret
}
`);

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing RAM address for ${name}`);
  return Number.parseInt(match[1], 16);
}

function readByte(core, asm, name) {
  return core.readRam(addressOf(asm, name), 1)[0];
}

function readWord(core, asm, name) {
  const bytes = core.readRam(addressOf(asm, name), 2);
  return bytes[0] | (bytes[1] << 8);
}

try {
  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, [
      "tools/amyc.mjs", source, "--asm", asmPath, "--rom", romPath, "--opt", profile
    ], { cwd: root, encoding: "utf8" });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.doesNotMatch(asm, /AMY_PROC_RETURN/, `${profile}: provisional return marker leaked into assembly`);

    const core = await GearcolecoTestCore.create({ seed: 0xF04A });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 45; frame += 1) core.runFrame();
      assert.equal(readByte(core, asm, "Done"), 77, `${profile}: program completed`);
      assert.equal(readByte(core, asm, "Back"), 1, `${profile}: early sub return restored caller`);
      assert.equal(readByte(core, asm, "Sum"), 6, `${profile}: dynamic FOR after early return`);
      assert.equal(readByte(core, asm, "PickOne"), 1, `${profile}: early function return`);
      assert.equal(readByte(core, asm, "PickTwo"), 0, `${profile}: framed function normal return`);
      assert.equal(readWord(core, asm, "Product"), 127, `${profile}: named-constant product in sum`);
      assert.equal(readWord(core, asm, "Shifted"), 32, `${profile}: named-constant shift`);
      assert.equal(readByte(core, asm, "NarrowArg"), 128, `${profile}: u16 argument narrowed to u8`);
      assert.equal(readByte(core, asm, "NarrowRet"), 184, `${profile}: word expression narrowed for u8 parameter and return`);
      assert.equal(readByte(core, asm, "NarrowWideRet"), 128, `${profile}: u16 function value narrowed to u8 return`);
      assert.equal(readByte(core, asm, "CompareOne"), 0, `${profile}: i16 > u8 expression`);
      assert.equal(readByte(core, asm, "CompareTwo"), 0, `${profile}: i16 expression < u8`);
      assert.equal(readByte(core, asm, "BoolResult"), 3, `${profile}: comparison assigned to bool`);
      assert.equal(readByte(core, asm, "VpokeRead"), 68, `${profile}: vpoke function-call value`);
      assert.equal(readByte(core, asm, "CopyRead"), 77, `${profile}: source copy offset above 255`);
      assert.equal(readByte(core, asm, "CopyAt10"), 66, `${profile}: destination copy offset above 255`);
      assert.equal(readByte(core, asm, "CopyAt2"), 32, `${profile}: destination copy did not wrap`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Reported expression/frame ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

