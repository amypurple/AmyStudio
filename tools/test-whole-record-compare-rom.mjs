#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `project "WHOLE RECORD COMPARE ROM TEST"
memory "colecovision_legacy_sdcc"
record Stats:
  u16 Score
  u8 Flags[2]
end record
record Actor:
  u8 X
  i8 DX
  Stats Values
end record
record Other:
  u8 Bytes[6]
end record
record SceneState:
  Actor Actors[2]
end record
Actor Source
Actor Destination
Actor Items[2]
Other WrongType
SceneState EmptyScene
overlay SceneRam
  Game as SceneState
  Menu as SceneState
end overlay
u8 Index = 1
u8 Passed = 0
u8 Guard = 99

Source.X = 17
Source.DX = -3
Source.Values.Score = $3456
Source.Values.Flags[0] = 9
Source.Values.Flags[1] = 27
Destination = Source
if Source = Destination then Passed += 1
Destination.X = 18
if Source <> Destination then Passed += 1
Destination.Values = Source.Values
if Destination.Values = Source.Values then Passed += 1
Items[Index] = Source
if Items[Index] = Source then Passed += 1
SceneRam.Game.Actors[Index] = Source
if SceneRam.Game.Actors[Index] = Items[Index] then Passed += 1
if SceneRam.Game = SceneRam.Menu then Passed += 1
if SceneRam.Game <> EmptyScene then Passed += 1
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
    child.on("exit", (code) => resolveRun({ code, output }));
  });
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${name}`);
  return Number.parseInt(match[1], 16);
}

const temp = await mkdtemp(join(tmpdir(), "amy-record-compare-"));
try {
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const stem = join(temp, `compare-${profile}`);
    await writeFile(`${stem}.alexis`, source);
    const result = await compile(`${stem}.alexis`, `${stem}.asm`, `${stem}.rom`, profile);
    assert.equal(result.code, 0, `${profile}: ${result.output}`);
    const [asm, rom] = await Promise.all([readFile(`${stem}.asm`, "utf8"), readFile(`${stem}.rom`)]);
    assert.match(asm, /AMY_RECORD_COMPARE_LOOP/i, `${profile}: missing inline record comparison`);
    const core = await GearcolecoTestCore.create({ seed: 0x52454343 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 6; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "Passed"), 1)[0], 7, `${profile}: comparisons`);
      assert.equal(core.readRam(addressOf(asm, "Guard"), 1)[0], 99, `${profile}: RAM guard`);
    } finally {
      core.destroy();
    }
  }

  for (const [name, condition] of [
    ["type-mismatch", "Source = WrongType"],
    ["ordering", "Source < Destination"]
  ]) {
    const stem = join(temp, name);
    await writeFile(`${stem}.alexis`, source.replace("if Source = Destination then Passed += 1", `if ${condition} then Passed += 1`));
    const result = await compile(`${stem}.alexis`, `${stem}.asm`, `${stem}.rom`, "balanced");
    assert.notEqual(result.code, 0, `${name} unexpectedly compiled`);
    assert.match(result.output, /invalid|unsupported|compatible|record/i, `${name}: typed diagnostic`);
  }
  console.log(`Whole-record compare ROM self-test PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
