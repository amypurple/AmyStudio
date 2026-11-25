import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GearcolecoTestCore, GEARCOLECO_TEST_INPUT as input } from "../../../studio/core/gearcolecoTestCore.js";

const [rom, bios] = process.argv.slice(2);
if (!rom || !bios) throw new Error("Usage: node smoke.mjs game.rom OS7.ROM");
const core = await GearcolecoTestCore.create({ seed: 1 });
try {
  core.loadBios(readFileSync(bios));
  core.loadRom(readFileSync(rom));
  const read = (x, y, n = 1) => String.fromCharCode(...core.readVram(0x1800 + 32 * y + x, n));
  const frames = n => { for (let i = 0; i < n; i++) core.runFrame(); };
  const tap = key => {
    core.setControllerMask(0, input[key]);
    frames(4);
    core.setControllerMask(0, 0);
    frames(4);
  };
  for (let n = 0; n < 1000 && read(10, 3, 12) !== "CRATE SWITCH"; n++) core.runFrame();
  assert.equal(read(10, 3, 12), "CRATE SWITCH");
  assert.equal(read(13, 10), "$");
  for (const key of ["LEFT", "UP", "RIGHT", "RIGHT"]) tap(key);
  assert.equal(read(15, 10), "$", "crate reached irrecoverable edge");
  tap("FIRE_LEFT");
  assert.equal(read(13, 10), "$", "reset restores crate");
  assert.equal(read(13, 11), "@", "reset restores player");
  for (const key of ["UP", "RIGHT", "UP", "LEFT", "LEFT"]) tap(key);
  assert.equal(read(11, 9), "$", "crate reached switch");
  assert.equal(read(10, 18, 10), "SWITCH ON!");
  tap("FIRE_RIGHT");
  assert.equal(read(10, 18, 10), "          ", "reset clears win state");
  console.log("Crate Switch ROM: trap, reset, win, reset PASS");
} finally {
  core.destroy();
}
