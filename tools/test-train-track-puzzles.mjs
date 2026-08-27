#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(import.meta.dirname, "..", "studio", "examples-src", "train-track-puzzle.alexis"), "utf8");
const puzzleCount = Number(source.match(/const\s+PuzzleCount\s*=\s*(\d+)/i)?.[1]);

function bytes(name) {
  const body = source.match(new RegExp(`data\\s+${name}\\s+bytes([\\s\\S]*?)end data`, "i"))?.[1];
  assert.ok(body, `missing ${name}`);
  return [...body.matchAll(/(?<![A-Za-z_$])\d+/g)].map((match) => Number(match[0]));
}

const solutions = Array.from({ length: puzzleCount }, (_, index) => bytes(`PuzzleSolution${index + 1}`)).flat();
const fixedCells = bytes("PuzzleFixedCells");
const rowCounts = bytes("PuzzleRowCounts");
const columnCounts = bytes("PuzzleColumnCounts");
const routes = bytes("PuzzleRoutes");
assert.match(source, /u16\s+PuzzleDataPointer\s*=\s*0/i, "solution-bank pointer must be 16-bit");
assert.match(source, /data\s+PuzzleSolutionTable\s+words\s*=\s*@PuzzleSolution1[\s\S]*?@PuzzleSolution9/i,
  "all nine solution blocks must be addressable through the ROM word table");
assert.match(source, /PuzzleDataPointer\s*=\s*PuzzleSolutionTable\[Puzzle\][\s\S]*?Solution\[I\]\s*=\s*peek\(PuzzleDataPointer\)[\s\S]*?PuzzleDataPointer \+= 1/i,
  "runtime loading must walk the selected 49-byte solution through a 16-bit pointer");
assert.match(source, /copy\s+Solution\s+count\s+49\s+to\s+Board[\s\S]*?DrawBoard[\s\S]*?CheckPuzzleComplete/i,
  "controller-2 solve path must copy the loaded solution before validating it");
assert.match(source, /clear sprites\s*[\r\n]+\s*update sprites[\s\S]*?WaterUpdating\s*=\s*0[\s\S]*?WaterTicks\s*=\s*0[\s\S]*?wait 1 frame[\s\S]*?Puzzle \+= 1/i,
  "puzzle transition must include one silent, animation-free frame before advancing");
assert.match(source, /sub\s+GameLoop:\s*[\r\n]+\s*'[\s\S]*?wait\s*[\r\n]+\s*BoardRedrawn\s*=\s*0[\s\S]*?if\s+BoardRedrawn\s*=\s*0\s+then\s+AnimateWater/i,
  "interactive VRAM writes must start after VBlank and skip water animation on board-redraw frames");
assert.equal(solutions.length, puzzleCount * 49, "solution bank size");
assert.equal(fixedCells.length, puzzleCount * 8, "fixed-clue bank size");
assert.equal(rowCounts.length, puzzleCount * 7, "row-count bank size");
assert.equal(columnCounts.length, puzzleCount * 7, "column-count bank size");
assert.equal(routes.length, puzzleCount * 21, "route bank size");

const direction = (from, to) => {
  const delta = to - from;
  return delta === 1 ? "E" : delta === -1 ? "W" : delta === 7 ? "S" : delta === -7 ? "N" : null;
};
const pieceForDirections = { EW: 1, NS: 2, EN: 3, ES: 4, SW: 5, NW: 6 };
const exitsBoard = (inside, edge) => {
  const x = edge % 7;
  const y = Math.floor(edge / 7);
  const delta = edge - inside;
  return (y === 0 && delta === -7)
    || (y === 6 && delta === 7)
    || (x === 0 && delta === -1)
    || (x === 6 && delta === 1);
};

for (let puzzle = 0; puzzle < puzzleCount; puzzle += 1) {
  const solution = solutions.slice(puzzle * 49, puzzle * 49 + 49);
  const fixedData = fixedCells.slice(puzzle * 8, puzzle * 8 + 8);
  const clues = fixedData.slice(1, fixedData[0] + 1);
  const routeData = routes.slice(puzzle * 21, puzzle * 21 + 21);
  const route = routeData.slice(1, routeData[0] + 1);
  assert.ok(route.length >= 2 && route.length <= 20, `puzzle ${puzzle + 1}: route length`);
  assert.equal(new Set(route).size, route.length, `puzzle ${puzzle + 1}: route repeats a cell`);
  assert.ok(exitsBoard(route[1], route[0]), `puzzle ${puzzle + 1}: start does not exit at the border`);
  assert.ok(exitsBoard(route.at(-2), route.at(-1)), `puzzle ${puzzle + 1}: end does not exit at the border`);

  const expected = Array(49).fill(0);
  for (let index = 0; index < route.length; index += 1) {
    const cell = route[index];
    assert.ok(cell >= 0 && cell < 49, `puzzle ${puzzle + 1}: route cell in range`);
    const directions = [];
    if (index > 0) directions.push(direction(cell, route[index - 1]));
    if (index + 1 < route.length) directions.push(direction(cell, route[index + 1]));
    assert.ok(directions.every(Boolean), `puzzle ${puzzle + 1}: non-adjacent route cells`);
    if (directions.length === 1) {
      directions.push({ E: "W", W: "E", N: "S", S: "N" }[directions[0]]);
    }
    expected[cell] = pieceForDirections[directions.sort().join("")];
  }
  assert.deepEqual(solution, expected, `puzzle ${puzzle + 1}: pieces do not match route`);
  assert.ok(fixedData[0] >= 1 && fixedData[0] <= 7, `puzzle ${puzzle + 1}: fixed-clue count`);
  assert.equal(new Set(clues).size, clues.length, `puzzle ${puzzle + 1}: repeated fixed clue`);
  assert.ok(clues.every((cell) => solution[cell] !== 0), `puzzle ${puzzle + 1}: invalid fixed clue`);

  const expectedRows = Array(7).fill(0);
  const expectedColumns = Array(7).fill(0);
  for (const cell of route) {
    expectedRows[Math.floor(cell / 7)] += 1;
    expectedColumns[cell % 7] += 1;
  }
  assert.deepEqual(rowCounts.slice(puzzle * 7, puzzle * 7 + 7), expectedRows, `puzzle ${puzzle + 1}: row hints`);
  assert.deepEqual(columnCounts.slice(puzzle * 7, puzzle * 7 + 7), expectedColumns, `puzzle ${puzzle + 1}: column hints`);
  if (puzzle >= 3) {
    assert.ok(expectedRows.every((count) => count > 0 && count < 7), `puzzle ${puzzle + 1}: empty or full row`);
    assert.ok(expectedColumns.every((count) => count > 0 && count < 7), `puzzle ${puzzle + 1}: empty or full column`);
  }
}

console.log(`Rails Puzzles: PASS (${puzzleCount} valid puzzles)`);
