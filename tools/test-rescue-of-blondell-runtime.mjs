#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT as INPUT,
  GEARCOLECO_TEST_REGION,
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));
const temp = mkdtempSync(join(tmpdir(), "amy-blondell-"));

function runFrames(core, count, input = 0) {
  core.setControllerMask(0, input);
  for (let frame = 0; frame < count; frame += 1) core.runFrame();
}

function tap(core, input) {
  runFrames(core, 4, input);
  runFrames(core, 6);
}

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-F]+)`, "m"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const asmPath = join(temp, "rescue-of-blondell.asm");
  const romPath = join(temp, "rescue-of-blondell.rom");
  const sourcePath = join(temp, "rescue-of-blondell.alexis");
  const source = readFileSync(resolve(root, "studio/examples-src/rescue-of-blondell.alexis"), "utf8")
    .replace(/^cartridge[^\r\n]*\r?\n/, "");
  const patternTable = source.match(/data ShiftPat bytes\r?\n([\s\S]*?)\r?\nend data\r?\ndata ShiftCol bytes/);
  assert.ok(patternTable, "missing compact scrolling pattern table");
  assert.equal([...patternTable[1].matchAll(/\$[0-9A-F]{2}/gi)].length, 4 * 288, "scrolling table must contain four two-pixel phases");
  writeFileSync(sourcePath, source);
  const build = spawnSync(process.execPath, [
    "tools/amyc.mjs",
    sourcePath,
    "--asm", asmPath,
    "--rom", romPath,
    "--opt", "balanced",
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(build.status, 0, `${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

  const asm = readFileSync(asmPath, "utf8");
  const scrollAddress = addressOf(asm, "AMY_UVAR_ScrollPx");
  const core = await GearcolecoTestCore.create({ seed: 0xB10D });
  try {
    core.loadBios(bios);
    core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    runFrames(core, 180);
    tap(core, INPUT.FIRE_LEFT);
    runFrames(core, 60);
    tap(core, INPUT.FIRE_LEFT);
    runFrames(core, 30);
    tap(core, INPUT.FIRE_LEFT);
    runFrames(core, 10);

    const spriteTableAddress = (core.getVdpRegisters()[5] & 0x7f) << 7;
    const roundMessageSprites = core.readVram(spriteTableAddress, 11 * 4);
    for (let sprite = 0; sprite < 11; sprite += 1) {
      assert.equal(roundMessageSprites[sprite * 4], 192, `sprite ${sprite} remained visible during the round message`);
    }
    runFrames(core, 110);

    assert.equal(core.getVdpRegisters()[4] & 0x03, 0, "Graphics II pattern thirds are not shared");
    const seenPhases = new Set();
    let changes = 0;
    let previous = core.readRam(scrollAddress, 2)[0];
    for (let frame = 0; frame < 420; frame += 1) {
      runFrames(core, 1, INPUT.RIGHT);
      const bytes = core.readRam(scrollAddress, 2);
      const scroll = bytes[0] | (bytes[1] << 8);
      if (scroll !== previous) changes += 1;
      previous = scroll;
      seenPhases.add(scroll & 7);
    }
    runFrames(core, 1);

    assert.ok(changes >= 140, `scroll advanced only ${changes} times`);
    assert.deepEqual([...seenPhases].sort((a, b) => a - b), [0, 2, 4, 6], "scrolling must use only the four two-pixel phases");
    console.log(`Rescue of Blondell runtime test: PASS (${changes} advances; phases 0/2/4/6)`);
  } finally {
    core.destroy();
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
