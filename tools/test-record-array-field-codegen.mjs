#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-record-array-field-"));

function compile(name, body, expectSuccess = true, optimization = "balanced") {
  const source = join(temp, `${name}.alexis`);
  const asm = join(temp, `${name}.asm`);
  writeFileSync(source, `project "${name}"\nmemory "colecovision_legacy_sdcc"\n${body}\n`);
  const result = spawnSync(process.execPath, [amyc, source, "--asm", asm, "--opt", optimization], {
    cwd: root,
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}${result.stderr || ""}${result.error ? `\n${result.error.stack || result.error}` : ""}`;
  if (expectSuccess) {
    assert.equal(result.status, 0, `${name} should compile:\n${output}`);
    return readFileSync(asm, "utf8");
  }
  assert.notEqual(result.status, 0, `${name} should be rejected`);
  return output;
}

function equAddress(asm, name) {
  const match = asm.match(new RegExp(`^${name}\\s+equ\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `Missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

try {
  const body = `
record SceneMemory:
  u8 Header
  u8 EnemyX[8]
  u16 Scores[3]
  u8 Footer
end record

SceneMemory State
u8 Index = 3
u8 Result = 0
u16 WordResult = 0

State.Header = 1
State.EnemyX[0] = 10
State.EnemyX[Index] = 40
State.Scores[2] = 1000
State.Header += 1
State.Header -= 1
State.EnemyX[Index] += 1
State.EnemyX[Index] -= 1
Result = State.EnemyX[Index]
WordResult = State.Scores[2]
State.Footer = Result
loop forever`;

  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const asm = compile(`record-array-field-${profile}`, body, true, profile);
    const state = equAddress(asm, "AMY_UVAR_State");
    const index = equAddress(asm, "AMY_UVAR_Index");
    assert.equal(index - state, 16, `${profile}: record must be byte-packed to exactly 16 bytes`);
    assert.match(asm, /ld hl,\$[0-9A-F]{4}\s+push hl[\s\S]*ld a,\(AMY_UVAR_Index\)[\s\S]*ld e,a\s+ld d,0[\s\S]*pop hl\s+add hl,de/i,
      `${profile}: dynamic byte field index must use compact address arithmetic`);
    assert.match(asm, /ld hl,\$[0-9A-F]{4}\s+inc \(hl\)/i,
      `${profile}: static byte record field += 1 must use direct INC (HL)`);
    assert.match(asm, /ld a,\(AMY_UVAR_Index\)[\s\S]{0,180}?add hl,de\s+inc \(hl\)/i,
      `${profile}: indexed byte record field += 1 must compute its address once`);
  }

  const badLength = compile("record-array-field-zero", `
record Bad:
  u8 Values[0]
end record
Bad Value
loop forever`, false);
  assert.match(badLength, /compile-time constant length from 1 to 255/i);

  compile("record-array-field-record", `
record Point:
  u8 X
end record
record Bad:
  Point Points[4]
end record
Bad Value
Value.Points[2].X = 7
loop forever`);

  const outOfRange = compile("record-array-field-bounds", `
record Bad:
  u8 Values[4]
end record
Bad Value
Value.Values[4] = 1
loop forever`, false);
  assert.match(outOfRange, /unsupported|cannot|assignment/i);

  const biosPath = join(root, "studio", "bios", "colecovision.rom");
  if (existsSync(biosPath)) {
    const runtimeBody = `
record TestMemory:
  u8 GuardBefore
  u8 Bytes[4]
  i8 SignedByte
  u8 GuardAfter
  u16 Words[2]
end record
record Actor:
  u8 X
  u8 Guard
end record
TestMemory State
Actor Actors[2]
u8 Index = 2
u8 PassCount = 0
State.GuardBefore = 17
State.GuardAfter = 23
State.Bytes[0] = 11
State.Bytes[Index] = 33
State.SignedByte = 127
State.Words[1] = $1234
State.Bytes[0] -= 1
State.Bytes[0] += 1
State.Bytes[Index] += 1
State.Bytes[Index] -= 1
State.SignedByte += 1
State.SignedByte -= 1
Actors[1].X = 255
Actors[1].Guard = 61
with Actors[1] as ActorRef
  ActorRef.X += 1
  ActorRef.X -= 1
end with
if State.Bytes[0] = 11 then PassCount += 1
if State.Bytes[Index] = 33 then PassCount += 1
if State.Words[1] = $1234 then PassCount += 1
if State.SignedByte = 127 then PassCount += 1
if State.GuardBefore = 17 and State.GuardAfter = 23 then PassCount += 1
if Actors[1].X = 255 and Actors[1].Guard = 61 then PassCount += 1
record_array_field_done:
loop forever`;
    const runtimeAsm = compile("record-array-field-runtime", runtimeBody);
    const source = join(temp, "record-array-field-runtime.alexis");
    const romPath = join(temp, "record-array-field-runtime.rom");
    const built = spawnSync(process.execPath, [amyc, source, "--rom", romPath, "--opt", "balanced"], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(built.status, 0, `runtime ROM should compile:\n${built.stdout || ""}${built.stderr || ""}`);
    const pass = equAddress(runtimeAsm, "AMY_UVAR_PassCount");
    const rom = readFileSync(romPath);
    rom[0] = 0x55;
    rom[1] = 0xAA;
    const core = await GearcolecoTestCore.create({ seed: 0x52414631 });
    try {
      core.loadBios(readFileSync(biosPath));
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      core.runFrame();
      assert.equal(core.readRam(pass, 1)[0], 6, "runtime record array-field checks did not all pass");
    } finally {
      core.destroy();
    }
  } else {
    console.log("Record array-field ROM test: SKIP (private ColecoVision BIOS absent)");
  }

  console.log("Record array fields: PASS (packed layout, byte/word access, bounds, runtime, five optimizer profiles)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
