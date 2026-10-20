#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-record-for-each-"));
const sourcePath = join(temp, "record-for-each.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const experimentalRecordIx = process.argv.includes("--experimental-record-ix");

writeFileSync(sourcePath, `project "RECORD FOR EACH RUNTIME"
memory "colecovision_legacy_sdcc"

record Actor:
  u8 X
  u8 Y
  u8 State
  u8 Hits
end record

record Motion:
  u8 Delta
end record

const ActorCount = 4
Actor Actors[ActorCount]
Actor Others[2]
Actor Single[1]
Motion Motions[4]
u8 I = 0
u8 J = 0
u8 ExitCount = 0
u16 Checksum = 0
u8 Passed = 0

sub Touch(ref Actor Current):
  Current.X += 10
  return
end sub

sub Exercise:
  for each Current, I in Actors
    Current.X += 1
    for J = 0 to 1
      Current.Y += 1
    next
    if I = 1 then continue for
    Current.State += I
    if I = 2 then Touch(Current)
  next Current
  return
end sub

sub NestedAliases:
  for each Current, I in Actors
    for each Other, J in Others
      Current.Hits += Other.X
    next Other
  next Current
  return
end sub

sub PairedRecords:
  for each Current, I in Actors
    Current.Hits += Motions[I].Delta
  next Current
  return
end sub

sub OpaqueBarrier:
  for each Current, I in Actors
    asm {
      nop
    }
    Current.Hits += 1
  next Current
  return
end sub

sub EarlyExit:
  for each Current, I in Actors
    ExitCount += 1
    Current.Hits += 1
    if I = 1 then continue for
    if I = 2 then exit for
  next Current
  return
end sub

sub LocalRecords:
  Actor LocalActors[2]
  u8 LocalIndex = 0
  LocalActors[0].X = 7
  LocalActors[1].X = 9
  for each LocalActor, LocalIndex in LocalActors
    Checksum += LocalActor.X
  next LocalActor
  return
end sub

Actors[0].X = 1
Actors[1].X = 2
Actors[2].X = 3
Actors[3].X = 4
Actors[0].Y = 10
Actors[1].Y = 20
Actors[2].Y = 30
Actors[3].Y = 40
Others[0].X = 2
Others[1].X = 3
Motions[0].Delta = 1
Motions[1].Delta = 2
Motions[2].Delta = 3
Motions[3].Delta = 4

Exercise
NestedAliases
PairedRecords
OpaqueBarrier
EarlyExit
LocalRecords

for each Only in Single
  Only.X = 9
next Only

for each Current, I in Actors
  Checksum += Current.X
  Checksum += Current.Y
  Checksum += Current.State
  Checksum += Current.Hits
next Current

if Actors[0].X = 2 then Passed += 1
if Actors[1].X = 3 then Passed += 1
if Actors[2].X = 14 then Passed += 1
if Actors[3].X = 5 then Passed += 1
if Actors[0].Y = 12 then Passed += 1
if Actors[1].Y = 22 then Passed += 1
if Actors[2].Y = 32 then Passed += 1
if Actors[3].Y = 42 then Passed += 1
if Actors[0].State = 0 then Passed += 1
if Actors[1].State = 0 then Passed += 1
if Actors[2].State = 2 then Passed += 1
if Actors[3].State = 3 then Passed += 1
if Actors[0].Hits = 8 then Passed += 1
if Actors[1].Hits = 9 then Passed += 1
if Actors[2].Hits = 10 then Passed += 1
if Actors[3].Hits = 10 then Passed += 1
if Checksum = 190 then Passed += 1
if ExitCount = 3 then Passed += 1
if Single[0].X = 9 then Passed += 1

record_for_each_done:
loop forever
`);

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}:?\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "mi"));
  assert.ok(match, `Missing symbol ${symbol}`);
  return Number.parseInt(match[1], 16);
}

function labelAddress(asm, label) {
  const generated = `AMY_ULBL_${label}`;
  const match = asm.match(new RegExp(`^${generated}:?\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "mi"));
  assert.ok(match, `Missing label ${generated}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || join(root, "studio", "bios", "colecovision.rom"));
  for (const profile of profiles) {
    const expectsRecordIx = experimentalRecordIx || ["balanced", "aggressive", "experimental"].includes(profile);
    const asmPath = join(temp, `${profile}.asm`);
    const symbolsPath = join(temp, `${profile}.sym`);
    const romPath = join(temp, `${profile}.rom`);
    const compileArgs = [
      join(root, "tools", "amyc.mjs"), sourcePath,
      "--asm", asmPath, "--symbols", symbolsPath, "--rom", romPath, "--opt", profile
    ];
    if (experimentalRecordIx) compileArgs.push("--experimental-record-ix");
    const compile = spawnSync(process.execPath, compileArgs, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(compile.status, 0, `${profile} compile failed:\n${compile.stdout || ""}${compile.stderr || ""}`);

    const asm = readFileSync(asmPath, "utf8");
    if (expectsRecordIx) {
      const routineBody = (name) => {
        const startMatch = new RegExp(`^AMY_UPROC_${name}:`, "im").exec(asm);
        const start = startMatch?.index ?? -1;
        const remainder = start >= 0 ? asm.slice(start + 1) : "";
        const endMatch = /^AMY_UPROC_[A-Za-z_][A-Za-z0-9_]*:/im.exec(remainder);
        const end = endMatch ? start + 1 + endMatch.index : asm.length;
        assert.ok(start >= 0 && end > start, `Missing ASM routine ${name}`);
        return asm.slice(start, end);
      };
      assert.doesNotMatch(routineBody("Exercise"), /\(ix[+-]/i, "Call-bearing alias routine must retain the RAM-pointer path");
      assert.doesNotMatch(routineBody("Exercise"), /(?:push hl\s+pop ix|ld ix,)[\s\S]*add ix,de/i, "Call-bearing alias routine must not prepare an IX iterator");
      assert.doesNotMatch(routineBody("NestedAliases"), /\(ix[+-]/i, "Nested aliases must retain the RAM-pointer path");
      const pairedRecords = routineBody("PairedRecords");
      assert.match(pairedRecords, /ld ix,[^\r\n]+[\s\S]*\(ix\+\d+\)/i, "The primary record iterator should retain IX while reading a second record array through HL");
      assert.equal((pairedRecords.match(/ld ix,[^\r\n]+/gi) || []).length, 1, "Parallel record access must not replace the primary IX iterator");
      const opaqueNop = asm.indexOf("    nop");
      assert.ok(opaqueNop >= 0, "Missing opaque ASM marker");
      assert.doesNotMatch(asm.slice(Math.max(0, opaqueNop - 300), opaqueNop + 300), /\(ix[+-]/i, "Opaque ASM must retain the RAM-pointer path");
      const earlyExit = routineBody("EarlyExit");
      assert.match(earlyExit, /ld ix,[^\r\n]+[\s\S]*\(ix\+\d+\)[\s\S]*add ix,de[\s\S]*pop ix\s+ret/i, "Safe static alias routine should install, advance, use, and restore the IX iterator");
      assert.equal((earlyExit.match(/ld ix,[^\r\n]+/gi) || []).length, 1, "Safe static alias routine should load its record base once");
      assert.doesNotMatch(earlyExit, /push hl\s+pop ix/i, "A static record base should use direct LD IX instead of an HL transfer");
      assert.doesNotMatch(routineBody("LocalRecords"), /\(ix\+0\)/i, "A local stack frame must retain the RAM-pointer alias path");
    } else {
      assert.doesNotMatch(
        asm,
        /ld ix,AMY_UVAR_(?:Actors|Others|Single|Motions)/i,
        `${profile} must retain the conservative record alias path`
      );
    }
    const symbols = readFileSync(symbolsPath, "utf8");
    const done = labelAddress(symbols, "record_for_each_done");
    const passed = addressOf(symbols, "AMY_UVAR_Passed");
    const checksum = addressOf(symbols, "AMY_UVAR_Checksum");
    const actors = addressOf(symbols, "AMY_UVAR_Actors");
    const core = await GearcolecoTestCore.create({ seed: 0x46454143 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      core.setExecuteBreakpoint(done);
      let reached = false;
      for (let frame = 0; frame < 30; frame += 1) {
        const result = core.runFrame();
        if (result.breakpointHit && result.pc === done) {
          reached = true;
          break;
        }
      }
      assert.equal(reached, true, `${profile}: completion label was not reached`);
      const actualPassed = core.readRam(passed, 1)[0];
      const checksumBytes = core.readRam(checksum, 2);
      const actualChecksum = checksumBytes[0] | checksumBytes[1] << 8;
      if (actualPassed !== 19 || actualChecksum !== 180) {
        console.error(`${profile} actors:`, [...core.readRam(actors, 16)]);
        console.error(`${profile} passed/checksum:`, actualPassed, actualChecksum);
      }
      assert.equal(actualPassed, 19, `${profile}: a for-each behavior assertion failed`);
      assert.equal(actualChecksum, 190, `${profile}: checksum differs`);
    } finally {
      core.destroy();
    }

    assert.match(asm, /AMY_UPROC_Exercise:/, `${profile}: Exercise routine is missing`);
    assert.match(asm, /AMY_UPROC_NestedAliases:/, `${profile}: nested alias routine is missing`);
  }
  console.log(`Record for-each runtime: PASS (${profiles.length} profiles, 19 assertions each)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
