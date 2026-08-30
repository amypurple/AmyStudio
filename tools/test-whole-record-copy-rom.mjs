#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = process.argv.slice(2).length ? process.argv.slice(2) : ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `project "WHOLE RECORD COPY ROM TEST"
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
Actor Snapshot
Actor Items[2]
Other WrongType
overlay SceneRam
  Game as SceneState
  Menu as SceneState
end overlay
u8 Index = 1
u16 WideIndex = 1
u8 XOut = 0
i8 DXOut = 0
u16 ScoreOut = 0
u8 FlagOut = 0
u16 NestedOut = 0
u8 OverlayOut = 0
Source.X = 17
Source.DX = -3
Source.Values.Score = $3456
Source.Values.Flags[0] = 9
Source.Values.Flags[1] = 27
Items[Index] = Source
Destination = Items[Index]
Destination.Values = Source.Values
SceneRam.Game.Actors[Index] = Source
Snapshot = SceneRam.Game.Actors[Index]
XOut = Destination.X
DXOut = Destination.DX
ScoreOut = Destination.Values.Score
FlagOut = Destination.Values.Flags[1]
NestedOut = SceneRam.Game.Actors[Index].Values.Score
OverlayOut = Snapshot.Values.Flags[0]
loop forever
`;

function compile(sourcePath, asmPath, romPath, profile, capture = false) {
  return new Promise((resolveRun, rejectRun) => {
    const chunks = [];
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "ignore"
    });
    if (capture) {
      child.stdout.on("data", (chunk) => chunks.push(chunk));
      child.stderr.on("data", (chunk) => chunks.push(chunk));
    }
    child.on("error", rejectRun);
    child.on("exit", (code) => resolveRun({ code, output: Buffer.concat(chunks).toString("utf8") }));
  });
}

function symbolAddress(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "m"));
  assert.ok(match, `missing symbol ${name}`);
  return Number.parseInt(match[1], 16);
}

const outputDir = await mkdtemp(join(tmpdir(), "amy-record-copy-"));
try {
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const stem = join(outputDir, `copy-${profile}`);
    await writeFile(`${stem}.alexis`, source);
    const result = await compile(`${stem}.alexis`, `${stem}.asm`, `${stem}.rom`, profile, true);
    assert.equal(result.code, 0, `${profile} compilation failed: ${result.output}`);
    const [asm, rom] = await Promise.all([readFile(`${stem}.asm`, "utf8"), readFile(`${stem}.rom`)]);
    assert.match(asm, /\n\s+ldir\s*\n/i, `${profile} did not emit LDIR`);
    rom[0] = 0x55;
    rom[1] = 0xaa;
    const core = await GearcolecoTestCore.create({ seed: 0x52454344 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 5; frame += 1) core.runFrame();
      const expected = {
        XOut: [17],
        DXOut: [0xfd],
        ScoreOut: [0x56, 0x34],
        FlagOut: [27],
        NestedOut: [0x56, 0x34],
        OverlayOut: [9]
      };
      for (const [name, bytes] of Object.entries(expected)) {
        assert.deepEqual([...core.readRam(symbolAddress(asm, name), bytes.length)], bytes, `${profile}/${name}`);
      }
    } finally {
      core.destroy();
    }
  }

  for (const [name, statement, expectedMessage] of [
    ["mismatch", "WrongType = Source", "type mismatch"],
    ["bad-index", "Destination = Items[WideIndex]", "record operands"]
  ]) {
    const stem = join(outputDir, name);
    await writeFile(`${stem}.alexis`, source.replace("Items[Index] = Source", statement));
    const result = await compile(`${stem}.alexis`, `${stem}.asm`, `${stem}.rom`, "balanced", true);
    assert.notEqual(result.code, 0, `${name} unexpectedly compiled`);
    assert.match(result.output, new RegExp(expectedMessage, "i"), `${name} diagnostic`);
  }
  {
    const stem = join(outputDir, "pointer-alias");
    const aliasSource = source.replace("Items[Index] = Source", `with Items[Index] as Item
  Item = Source
end with`);
    await writeFile(`${stem}.alexis`, aliasSource);
    const result = await compile(`${stem}.alexis`, `${stem}.asm`, `${stem}.rom`, "balanced", true);
    assert.notEqual(result.code, 0, "pointer-backed record alias assignment unexpectedly compiled");
    assert.match(result.output, /whole-record assignment through a pointer-backed with alias is not supported/i);
  }
  console.log(`Whole-record copy ROM self-test PASS (${profiles.length} profiles)`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
