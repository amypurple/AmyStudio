#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `project "2D ARRAY SELFTEST"
const BoardRows = 4
const BoardColumns = 5
const WordRows = 2
const WordColumns = $03
record GridState:
  u8 Cells[BoardRows,BoardColumns]
  u16 Costs[WordRows,WordColumns]
end record
overlay SharedGrid
  GameGrid as GridState
  EditGrid as GridState
end overlay
GridState State
GridState States[2]
u8 Board[BoardRows,BoardColumns]
u16 Words[WordRows,WordColumns]
u8 Row = 2
u8 Column = 3
u8 Passed = 0
u16 LocalResult = 0
sub start:
  Board[0,0] = 11
  Board[Row,Column] = 42
  Board[Row-1,Column+1] = 77
  Words[1,2] = $1234
  State.Cells[Row,Column] = 51
  State.Costs[1,2] = $4567
  States[1].Cells[Row-1,Column] = 61
  SharedGrid.GameGrid.Cells[Row,Column-1] = 71
  CheckRecordGrid(State)
  if Board[0,0] = 11 then Passed += 1
  if Board[Row,Column] = 42 then Passed += 1
  if Board[Row-1,Column+1] = 77 then Passed += 1
  if Words[1,2] = $1234 then Passed += 1
  if State.Cells[Row,Column] = 51 then Passed += 1
  if State.Costs[1,2] = $4567 then Passed += 1
  if States[1].Cells[Row-1,Column] = 61 then Passed += 1
  if SharedGrid.EditGrid.Cells[Row,Column-1] = 71 then Passed += 1
  CheckLocalGrid(1)
  CheckLocalGrid(2)
  CheckOtherGrid
  if Board[Row,Column] = 42 then Passed += 1
  loop forever
end sub

sub CheckLocalGrid(u8 Seed):
  u8 LocalBoard[WordRows,WordColumns] = 0
  u16 LocalWords[2,2] = 0
  u8 LocalRow = 1
  LocalBoard[LocalRow,Seed] = Seed + 20
  LocalWords[LocalRow,Seed-1] = $1200 + Seed
  LocalResult += LocalBoard[LocalRow,Seed]
  LocalResult += LocalWords[LocalRow,Seed-1]
  if LocalBoard[LocalRow,Seed] = Seed + 20 then Passed += 1
  return
end sub

sub CheckOtherGrid:
  u8 LocalBoard[1,2] = 0
  LocalBoard[0,1] = 5
  LocalResult += LocalBoard[0,1]
  if LocalBoard[0,1] = 5 then Passed += 1
  return
end sub

sub CheckRecordGrid(ref GridState Grid):
  GridState LocalGrid
  LocalGrid.Cells[1,1] = 81
  Grid.Cells[1,2] = 91
  if LocalGrid.Cells[1,1] = 81 then Passed += 1
  if Grid.Cells[1,2] = 91 then Passed += 1
  return
end sub
`;

function compile(sourcePath, asmPath, romPath, profile = "balanced") {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      stdio: "inherit"
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => resolveRun(code));
  });
}

function equ(asm, name) {
  const match = asm.match(new RegExp(`^${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "mi"));
  assert.ok(match, `missing ${name}`);
  return Number.parseInt(match[1], 16);
}

const output = await mkdtemp(join(tmpdir(), "amy-2d-array-"));
try {
  const sourcePath = join(output, "array2d.alexis");
  await writeFile(sourcePath, source);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(output, `${profile}.asm`);
    const romPath = join(output, `${profile}.rom`);
    assert.equal(await compile(sourcePath, asmPath, romPath, profile), 0, `${profile}: compilation failed`);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const board = equ(asm, "AMY_UVAR_Board");
    const words = equ(asm, "AMY_UVAR_Words");
    const row = equ(asm, "AMY_UVAR_Row");
    const passed = equ(asm, "AMY_UVAR_Passed");
    const localResult = equ(asm, "AMY_UVAR_LocalResult");
    assert.equal(words - board, 20, `${profile}: byte declaration was not lowered to 20 elements`);
    assert.equal(row - words, 12, `${profile}: word declaration was not lowered to 6 elements`);
    rom[0] = 0x55;
    rom[1] = 0xAA;
    const core = await GearcolecoTestCore.create({ seed: 0x32444152 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      assert.equal(core.readRam(passed, 1)[0], 14, `${profile}: global/local/record/overlay 2D reads failed`);
      assert.deepEqual([...core.readRam(localResult, 2)], [0x33, 0x24], `${profile}: local 2D values or calls failed`);
      const bytes = core.readRam(board, 20);
      assert.equal(bytes[0], 11, `${profile}: Board[0,0] address`);
      assert.equal(bytes[2 * 5 + 3], 42, `${profile}: Board[2,3] row-major address`);
      assert.equal(bytes[1 * 5 + 4], 77, `${profile}: expression indexes`);
      assert.deepEqual([...core.readRam(words + (1 * 3 + 2) * 2, 2)], [0x34, 0x12], `${profile}: word row-major address`);
      assert.doesNotMatch(asm, /AMY_LVAR_CheckLocalGrid_(?:LocalBoard|LocalWords)/i,
        `${profile}: local 2D arrays must remain stack-relative`);
    } finally {
      core.destroy();
    }
  }

  const invalid = [
    ["too-large", "u8 Board[16,16]\nloop forever\n", /1\.\.255 elements/i],
    ["unknown", "u8 Board[16]\nBoard[1,2] = 3\nloop forever\n", /no matching 2D array/i],
    ["bounds", "u8 Board[3,4]\nBoard[3,0] = 1\nloop forever\n", /outside 3x4/i],
    ["unknown-constant", "const Rows = 3\nu8 Board[Rows,MissingColumns]\nloop forever\n", /unknown 2D array dimension constant/i],
    ["record-bounds", "record Grid:\n  u8 Cells[4,4]\nend record\nGrid State\nState.Cells[4,0] = 1\nloop forever\n", /outside 4x4/i],
    ["overlay-direct", "overlay Bad\n  u8 Cells[4,4]\nend overlay\nloop forever\n", /must be fields of an overlay part record/i]
  ];
  for (const [name, text] of invalid) {
    const badSource = join(output, `${name}.alexis`);
    const badAsm = join(output, `${name}.asm`);
    await writeFile(badSource, `project "BAD 2D"\n${text}`);
    assert.notEqual(await compile(badSource, badAsm, join(output, `${name}.rom`)), 0, `${name}: invalid 2D form compiled`);
  }
} finally {
  await rm(output, { recursive: true, force: true });
}

console.log("2D array ROM: PASS (5 profiles)");
