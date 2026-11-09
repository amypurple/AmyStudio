#!/usr/bin/env node
import assert from "node:assert/strict";
import { analyzeCheckpoint, analyzeTemporalVdp } from "./amy-author-visual-proof.mjs";

function snapshot() {
  const registers = new Uint8Array([2, 0xC0, 6, 0xFF, 3, 0x36, 7, 4]);
  const vram = new Uint8Array(0x4000);
  vram[0x1B00] = 40;
  vram[0x1B01] = 80;
  vram[0x1B02] = 12;
  vram[0x1B03] = 15;
  vram[0x1B04] = 208;
  return { registers, vram };
}

const before = snapshot(), current = snapshot(), after = snapshot();
current.vram[0x1B03] = 0;
for (let index = 0; index < 401; ++index) current.vram[0x1800 + index] = 1;
const strict = analyzeTemporalVdp(before, current, after, { wipePolicy: "clear", flickerPolicy: "clear" });
assert.equal(strict.find((item) => item.id === "visible-page-write").state, "FAIL");
assert.equal(strict.find((item) => item.id === "one-frame-sprite-flicker").state, "FAIL");

const allowed = analyzeTemporalVdp(before, current, after, { wipePolicy: "allow", flickerPolicy: "allow" });
assert.ok(allowed.every((item) => item.state === "PASS"));

const stable = analyzeTemporalVdp(before, before, before, { wipePolicy: "clear", flickerPolicy: "clear" });
assert.ok(stable.every((item) => item.state === "PASS"));

const frame = (fill) => ({ width: 256, height: 192, pixels: new Uint16Array(256 * 192).fill(fill) });
const nearlyUniform = frame(0xffff);
nearlyUniform.pixels[0] = 0;
const uniform = analyzeCheckpoint(frame(0xffff), nearlyUniform, frame(0xffff), new Uint8Array(768), {
  uniformPolicy: "clear",
  edgePolicy: "measure"
});
assert.equal(uniform.find((item) => item.id === "dominant-color").state, "FAIL");

const contrasted = frame(0);
for (let index = 0; index < contrasted.pixels.length / 4; ++index) contrasted.pixels[index] = 0xffff;
const contrast = analyzeCheckpoint(contrasted, contrasted, contrasted, new Uint8Array(768), { uniformPolicy: "clear" });
assert.equal(contrast.find((item) => item.id === "dominant-color").state, "PASS");

console.log("Amy visual proof: PASS (visible page writes and one-frame sprite flicker)");
