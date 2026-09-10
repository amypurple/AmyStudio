#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const ENTRY_MARKER = Uint8Array.from([0xf5, 0x3e, 0xca, 0xee, 0xfe, 0xee, 0xfe, 0xfe, 0xca, 0xf1]);
const EXIT_MARKER = Uint8Array.from([0xf5, 0x3e, 0xbe, 0xee, 0xef, 0xee, 0xef, 0xfe, 0xbe, 0xf1]);
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceArg = process.argv.slice(2).find(argument => !argument.startsWith("--"));
const coreOnly = process.argv.includes("--core-only");
let source = sourceArg
  ? path.resolve(root, sourceArg)
  : path.join(root, "competition", "benchmarks", "state-update", "amy-state-update.alexis");
const bios = fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom"));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-state-update-"));
const results = [];

if (coreOnly) {
  const coreSource = fs.readFileSync(source, "utf8")
    .replace(/text screen\r?\n[\s\S]*?screen on\r?\n\r?\nfor ActorIndex/, "for ActorIndex")
    .replace(/\r?\nprint at 5,8,[\s\S]*?\r?\n\r?\nStateUpdateDone:/, "\n\nStateUpdateDone:");
  source = path.join(temp, "amy-state-update-core.alexis");
  fs.writeFileSync(source, coreSource);
}

try {
  for (const profile of profiles) {
    const asmPath = path.join(temp, `${profile}.asm`);
    const romPath = path.join(temp, `${profile}.rom`);
    const compiled = spawnSync(process.execPath, [
      path.join(root, "tools", "amyc.mjs"), source,
      "--asm", asmPath, "--rom", romPath, "--opt", profile,
    ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(compiled.status, 0, `${profile} compile failed:\n${compiled.stdout}\n${compiled.stderr}`);

    const asm = fs.readFileSync(asmPath, "utf8");
    const rom = fs.readFileSync(romPath);
    const symbols = Object.fromEntries(["WorldMode", "CollisionCount", "Score", "Checksum"].map(name => [name, symbolAddress(asm, name)]));
    const entry = uniqueMarkerAddress(rom, ENTRY_MARKER) + ENTRY_MARKER.length;
    const exit = uniqueMarkerAddress(rom, EXIT_MARKER);
    const core = await GearcolecoTestCore.create({ seed: 0x53544154 });
    const updateCycles = [];
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let tick = 0; tick < 48; tick += 1) {
        runToBreakpoint(core, entry, 5, `${profile} tick ${tick} entry`);
        const started = core.getMasterClockCycles();
        runToBreakpoint(core, exit, 5, `${profile} tick ${tick} exit`);
        updateCycles.push(core.getMasterClockCycles() - started);
      }
      for (let frame = 0; frame < 5; frame += 1) core.runFrame();
      const state = {
        worldMode: core.readRam(symbols.WorldMode, 1)[0],
        collisions: core.readRam(symbols.CollisionCount, 1)[0],
        score: readWord(core, symbols.Score),
        checksum: readWord(core, symbols.Checksum),
      };
      results.push({ profile, romBytes: rom.length, averageCycles: average(updateCycles), worstCycles: Math.max(...updateCycles), state });
    } finally {
      core.destroy();
    }
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const expected = simulateReference();
assert.deepEqual(expected, { worldMode: 1, collisions: 13, score: 425, checksum: 1478 }, "Reference behavior changed");
for (const result of results) assert.deepEqual(result.state, expected, `${result.profile} differs from the independent model`);
console.table(results.map(({ profile, romBytes, averageCycles, worstCycles, state }) => ({ profile, romBytes, averageCycles, worstCycles, ...state })));
console.log(`State-update benchmark PASS (5 profiles, 48 measured updates each${coreOnly ? ", core only" : ""})`);

function symbolAddress(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "mi"));
  assert.ok(match, `Missing generated symbol for ${name}`);
  return Number.parseInt(match[1], 16);
}

function uniqueMarkerAddress(rom, marker) {
  const matches = [];
  for (let offset = 0; offset <= rom.length - marker.length; offset += 1) {
    if (marker.every((value, index) => rom[offset + index] === value)) matches.push(0x8000 + offset);
  }
  assert.equal(matches.length, 1, `Expected one marker, found ${matches.length}`);
  return matches[0];
}

function runToBreakpoint(core, address, frameLimit, label) {
  core.clearAllBreakpoints();
  core.setExecuteBreakpoint(address);
  for (let frame = 0; frame < frameLimit; frame += 1) {
    const result = core.runFrame();
    if (result.breakpointHit && result.pc === address) {
      core.clearAllBreakpoints();
      return;
    }
  }
  throw new Error(`${label} was not reached`);
}

function readWord(core, address) {
  const bytes = core.readRam(address, 2);
  return bytes[0] | bytes[1] << 8;
}

function average(values) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function simulateReference() {
  const actors = Array.from({ length: 6 }, (_, index) => ({
    x: 24 + index * 24,
    y: 48 + index * 8,
    direction: index & 1,
    timer: 3 + index,
    mode: 0,
    hits: 0,
  }));
  let worldMode = 1;
  let playerX = 88;
  const playerY = 80;
  let collisions = 0;
  let score = 0;
  for (let tick = 0; tick < 48; tick += 1) {
    if (worldMode === 2) {
      score += 100;
      playerX += 4;
      worldMode = 1;
      continue;
    }
    for (let index = 0; index < actors.length; index += 1) {
      const actor = actors[index];
      if (actor.mode === 0) {
        actor.x += actor.direction === 0 ? 1 : -1;
        if (actor.x >= 208) actor.direction = 1;
        if (actor.x <= 16) actor.direction = 0;
      } else if (actor.mode === 1) {
        if (actor.x < playerX) actor.x += 2;
        else if (actor.x > playerX) actor.x -= 2;
        if (actor.y < playerY) actor.y += 1;
        if (actor.y > playerY) actor.y -= 1;
      } else if (actor.timer === 0) {
        actor.mode = 0;
        actor.timer = 5 + index;
      }
      if (actor.timer > 0) actor.timer -= 1;
      if (actor.timer === 0 && actor.mode === 0) {
        actor.mode = 1;
        actor.timer = 8;
      } else if (actor.timer === 0 && actor.mode === 1) {
        actor.mode = 2;
        actor.timer = 4;
      }
      if (actor.mode !== 2 && boxesCollide(playerX, playerY, 12, 12, actor.x, actor.y, 8, 8)) {
        actor.hits += 1;
        collisions += 1;
        score += 25;
        actor.mode = 2;
        actor.timer = 6;
      }
    }
    if (tick === 23) worldMode = 2;
  }
  const checksum = actors.reduce((sum, actor) => sum + actor.x + actor.y + actor.timer + actor.mode + actor.hits, 0) + score + collisions;
  return { worldMode, collisions, score, checksum };
}

function boxesCollide(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;
}
