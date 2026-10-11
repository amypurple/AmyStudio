#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-record-ix-"));
const sourcePath = join(temp, "record-ix.alexis");
const asmPath = join(temp, "record-ix.asm");
const romPath = join(temp, "record-ix.rom");
const symbolsPath = join(temp, "record-ix.sym");

writeFileSync(sourcePath, `record Actor:
  u8 X
  u8 Hits
end record
record Motion:
  u8 Delta
end record
Actor Actors[4]
Motion Motions[4]
u8 I = 0
u8 Passed = 0
sub Touch(ref Actor Current):
  Current.X += 10
  return
end sub
sub SafeLoop:
  for each Current, I in Actors
    Current.X += 1
    if I = 1 then continue for
    Current.Hits += 2
    if I = 2 then exit for
  next Current
  return
end sub
sub CallBarrier:
  for each Current, I in Actors
    if I = 2 then Touch(Current)
  next Current
  return
end sub
sub PairedRecords:
  for each Current, I in Actors
    Current.Hits += Motions[I].Delta
  next Current
  return
end sub
Motions[0].Delta = 1
Motions[1].Delta = 2
Motions[2].Delta = 3
Motions[3].Delta = 4
SafeLoop
CallBarrier
PairedRecords
if Actors[0].X = 1 then Passed += 1
if Actors[1].X = 1 then Passed += 1
if Actors[2].X = 11 then Passed += 1
if Actors[3].X = 0 then Passed += 1
if Actors[0].Hits = 3 then Passed += 1
if Actors[1].Hits = 2 then Passed += 1
if Actors[2].Hits = 5 then Passed += 1
if Actors[3].Hits = 4 then Passed += 1
record_ix_done:
loop forever
`);

try {
  const compile = spawnSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--symbols", symbolsPath, "--rom", romPath, "--opt", "experimental"], {
    cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024
  });
  assert.equal(compile.status, 0, `compile failed:\n${compile.stdout || ""}${compile.stderr || ""}`);
  const asm = readFileSync(asmPath, "utf8");
  const routine = (name) => {
    const start = asm.search(new RegExp(`^AMY_UPROC_${name}:`, "m"));
    assert.ok(start >= 0, `missing ${name}`);
    const tail = asm.slice(start + 1);
    const next = tail.search(/^AMY_UPROC_[A-Za-z_][A-Za-z0-9_]*:/m);
    return asm.slice(start, next >= 0 ? start + 1 + next : asm.length);
  };
  const safe = routine("SafeLoop");
  assert.equal((safe.match(/ld ix,[^\r\n]+/gi) || []).length, 1, "static iterator base should load directly once");
  assert.doesNotMatch(safe, /push hl\s+pop ix/i, "static iterator base should not transfer through HL");
  assert.match(safe, /\(ix\+\d+\)[\s\S]*(?:add ix,de|inc ix\s+inc ix)[\s\S]*pop ix\s+ret/i,
    "safe loop should use and advance IX");
  const paired = routine("PairedRecords");
  assert.match(paired, /ld ix,[^\r\n]+[\s\S]*\(ix\+\d+\)/i,
    "primary record iterator should retain IX while a second record array uses HL");
  assert.equal((paired.match(/ld ix,[^\r\n]+/gi) || []).length, 1,
    "parallel record access must not replace the primary IX iterator");
  const callLoop = asm.match(/AMY_FOR_LOOP_5:[\s\S]*?AMY_FOR_EXIT_6:/i)?.[0] || "";
  assert.ok(callLoop, "missing inlined call-bearing loop");
  assert.doesNotMatch(callLoop, /\(ix[+-]/i, "call-bearing loop must retain fallback lowering");

  const symbols = readFileSync(symbolsPath, "utf8");
  const passed = Number.parseInt(symbols.match(/^AMY_UVAR_Passed:?\s+EQU\s+\$([0-9A-Fa-f]+)/im)[1], 16);
  const done = Number.parseInt(symbols.match(/^AMY_ULBL_record_ix_done:?\s+EQU\s+\$([0-9A-Fa-f]+)/im)[1], 16);
  const core = await GearcolecoTestCore.create({ seed: 0x524958 });
  try {
    core.loadBios(readFileSync(join(root, "studio", "bios", "colecovision.rom")));
    core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    core.setExecuteBreakpoint(done);
    let reached = false;
    for (let frame = 0; frame < 30; frame += 1) {
      const result = core.runFrame();
      if (result.breakpointHit && result.pc === done) { reached = true; break; }
    }
    assert.equal(reached, true, "completion label not reached");
    assert.equal(core.readRam(passed, 1)[0], 8, "record iterator changed program behavior");
  } finally {
    core.destroy();
  }
  console.log("Record for-each IX runtime: PASS");
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
