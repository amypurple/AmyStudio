#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = await mkdtemp(join(tmpdir(), "amy-fixed32-array-"));

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

try {
  const source = join(temp, "fixed32-array.alexis");
  await writeFile(source, `project "FIXED32 ARRAY ROM"
memory "colecovision_legacy_sdcc"
record Motion:
  fixed32 X
  fixed32 Y
  fixed32 Samples[2]
end record
Motion Actor
Motion Actors[2]
overlay SharedMotion
  Game as Motion
  Menu as Motion
end overlay
u8 GuardBefore = 77
fixed32 Result0 = 0.0
fixed32 Result1 = 0.0
fixed32 Result2 = 0.0
fixed32 GlobalValues[2] = 1.25
u8 Index = 1
u8 Passed = 0
u8 GuardAfter = 88

sub start:
  fixed32 Values[3] = 0.0
  Motion LocalActor = 0
  Values[0] = 1.5
  Values[1] = -2.25
  Values[2] = Values[0]
  Values[2] += 0.5
  GlobalValues[Index] = -3.5
  GlobalValues[Index] *= 2.0
  GlobalValues[Index] /= 2.0
  Actor.X = 1.75
  Actor.X += 0.25
  Actor.Y = Actor.X
  Actor.Samples[Index] = 3.25
  Actor.Samples[Index] -= 0.25
  Actors[1].Samples[0] = -4.25
  Actors[1].Samples[0] += 0.25
  LocalActor.Samples[Index] = 5.5
  LocalActor.Samples[Index] *= 2.0
  SharedMotion.Game.X = -1.25
  SharedMotion.Game.X -= 0.75
  SharedMotion.Game.Y = SharedMotion.Game.X
  SharedMotion.Game.Samples[0] = 4.5
  SharedMotion.Game.Samples[0] /= 1.5
  Result0 = Values[0]
  Result1 = Values[1]
  Result2 = Values[2]
  if Values[0] = 1.5 and Values[1] = -2.25 and Values[2] = 2.0 and GlobalValues[0] = 1.25 and GlobalValues[Index] = -3.5 and Actor.X = 2.0 and Actor.Y = 2.0 and Actor.Samples[Index] = 3.0 and Actors[1].Samples[0] = -4.0 and LocalActor.Samples[Index] = 11.0 and SharedMotion.Game.X = -2.0 and SharedMotion.Menu.Y = -2.0 and SharedMotion.Menu.Samples[0] = 3.0 then
    Passed = 1
  end if
  loop forever
end sub
`);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `fixed32-array-${profile}.asm`);
    const romPath = join(temp, `fixed32-array-${profile}.rom`);
    await compile(source, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const core = await GearcolecoTestCore.create({ seed: 0x46333241 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "GuardBefore"), 1)[0], 77, `${profile}: guard before`);
      assert.equal(core.readRam(addressOf(asm, "GuardAfter"), 1)[0], 88, `${profile}: guard after`);
      assert.deepEqual([...core.readRam(addressOf(asm, "Result0"), 4)], [0x00, 0x80, 0x01, 0x00], `${profile}: 1.5`);
      assert.deepEqual([...core.readRam(addressOf(asm, "Result1"), 4)], [0x00, 0xC0, 0xFD, 0xFF], `${profile}: -2.25`);
      assert.deepEqual([...core.readRam(addressOf(asm, "Result2"), 4)], [0x00, 0x00, 0x02, 0x00], `${profile}: 2.0`);
      assert.deepEqual([...core.readRam(addressOf(asm, "GlobalValues"), 8)], [0x00, 0x40, 0x01, 0x00, 0x00, 0x80, 0xFC, 0xFF], `${profile}: global array`);
      assert.deepEqual([...core.readRam(addressOf(asm, "Actor"), 16)], [0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02, 0x00, 0, 0, 0, 0, 0x00, 0x00, 0x03, 0x00], `${profile}: record fields`);
      assert.equal(core.readRam(addressOf(asm, "Passed"), 1)[0], 1, `${profile}: comparisons`);
    } finally {
      core.destroy();
    }
  }
  console.log(`fixed32 array ROM: PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
