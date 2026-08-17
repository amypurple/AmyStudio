#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  applyTmsPixelColor,
  drawEditorTilePattern,
  drawTileGridEditorOverlay,
  renderTileGrid,
  tileColorOffsetForValue,
  tileColorRowsForValue,
  tilePatternBytesForValue
} from "../studio/core/graphicsTms9918.js";

function makeContext() {
  const calls = [];
  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    calls,
    fillRect(x, y, w, h) { calls.push({ kind: "fill", style: this.fillStyle, x, y, w, h }); },
    strokeRect(x, y, w, h) { calls.push({ kind: "strokeRect", style: this.strokeStyle, x, y, w, h }); },
    beginPath() { calls.push({ kind: "begin" }); },
    moveTo(x, y) { calls.push({ kind: "move", x, y }); },
    lineTo(x, y) { calls.push({ kind: "line", x, y }); },
    stroke() { calls.push({ kind: "stroke", style: this.strokeStyle }); },
    save() { calls.push({ kind: "save" }); },
    restore() { calls.push({ kind: "restore" }); },
    fillText(text, x, y) { calls.push({ kind: "text", style: this.fillStyle, text, x, y }); }
  };
  return ctx;
}

assert.deepEqual(applyTmsPixelColor(0x00, 0xF1, 0, 0xF), { patternByte: 0x80, colorByte: 0xF1 });
assert.deepEqual(applyTmsPixelColor(0x80, 0xF1, 0, 0x1), { patternByte: 0x00, colorByte: 0xF1 });
assert.deepEqual(applyTmsPixelColor(0x80, 0xF1, 0, 0x6), { patternByte: 0x80, colorByte: 0x61 });
assert.deepEqual(applyTmsPixelColor(0x00, 0xF1, 0, 0x6), { patternByte: 0x80, colorByte: 0x61 });
assert.deepEqual(applyTmsPixelColor(0x00, 0xF1, 0, 0x0), { patternByte: 0x80, colorByte: 0x01 });
assert.deepEqual(applyTmsPixelColor(0xFF, 0xF1, 7, 0x6), { patternByte: 0xFE, colorByte: 0xF6 });

const pattern = Uint8Array.from([
  0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01,
  0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0xFF, 0x00
]);
assert.deepEqual(Array.from(tilePatternBytesForValue(pattern, 0x80, 0x80)), [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]);
assert.equal(tilePatternBytesForValue(pattern, 0x7F, 0x80), null);
assert.equal(tilePatternBytesForValue(pattern, 0x82, 0x80), null);

const color = new Uint8Array(6144);
color[0x80 * 8] = 0xF1;
color[2048 + 0x80 * 8] = 0xE2;
color[4096 + 0x80 * 8] = 0xD3;
assert.equal(tileColorOffsetForValue(color, 0x80, 0x80, 0), 0x80 * 8);
assert.equal(tileColorOffsetForValue(color, 0x80, 0x80, 8), 2048 + 0x80 * 8);
assert.equal(tileColorOffsetForValue(color, 0x80, 0x80, 16), 4096 + 0x80 * 8);
assert.equal(tileColorRowsForValue(color, pattern, 0x80, 0x80, 8)[0], 0xE2);

const compactMode2Color = new Uint8Array(32);
compactMode2Color[0x80 >> 3] = 0x51;
assert.deepEqual(Array.from(tileColorRowsForValue(compactMode2Color, pattern, 0x80, 0x80, 0)), [0x51, 0x51, 0x51, 0x51, 0x51, 0x51, 0x51, 0x51]);

const transparentEditorCtx = makeContext();
drawEditorTilePattern(transparentEditorCtx, new Uint8Array(8), 0, 0, 4, "#fff", "#000", new Uint8Array(8).fill(0x10));
assert.ok(transparentEditorCtx.calls.some((call) => call.kind === "fill" && call.style === "#5d6670"));
assert.ok(transparentEditorCtx.calls.some((call) => call.kind === "fill" && call.style === "#252b31"));

const blackEditorCtx = makeContext();
drawEditorTilePattern(blackEditorCtx, new Uint8Array(8), 0, 0, 4, "#fff", "#000", new Uint8Array(8).fill(0x11));
assert.ok(blackEditorCtx.calls.some((call) => call.kind === "fill" && call.style === "#000000"));
assert.equal(blackEditorCtx.calls.some((call) => call.kind === "fill" && call.style === "#5d6670"), false);

const ctx = makeContext();
renderTileGrid(ctx, {
  bytes: Uint8Array.from([0x80, 0x20]),
  width: 2,
  height: 1,
  patternBytes: pattern,
  colorBytes: color,
  baseTile: 0x80,
  blankTile: 0x20,
  screenY: 8,
  scale: 1,
  showGrid: false,
  selectedTile: 0x80,
  fallbackFgForTile: (value) => value === 0x80 ? "#123456" : "#abcdef"
});
assert.equal(ctx.imageSmoothingEnabled, false);
assert.ok(ctx.calls.some((call) => call.kind === "fill" && call.style === "#cccccc"));
assert.ok(ctx.calls.some((call) => call.kind === "fill" && call.style === "#21c842"));
assert.ok(ctx.calls.some((call) => call.kind === "strokeRect"));

const fallbackCtx = makeContext();
renderTileGrid(fallbackCtx, {
  bytes: Uint8Array.from([0x80]),
  width: 1,
  height: 1,
  patternBytes: pattern,
  baseTile: 0x80,
  scale: 1,
  showGrid: false,
  fallbackFgForTile: () => "#123456"
});
assert.ok(fallbackCtx.calls.some((call) => call.kind === "fill" && call.style === "#123456"));

const cleanGameCtx = makeContext();
renderTileGrid(cleanGameCtx, {
  bytes: Uint8Array.from([0x80]),
  width: 1,
  height: 1,
  patternBytes: pattern,
  baseTile: 0x80,
  scale: 1,
  showGrid: false,
  selectedTile: null
});
assert.equal(cleanGameCtx.calls.some((call) => call.kind === "strokeRect"), false);
assert.equal(cleanGameCtx.calls.some((call) => call.kind === "stroke"), false);

const overlayOnlyCtx = makeContext();
drawTileGridEditorOverlay(overlayOnlyCtx, {
  bytes: Uint8Array.from([0x80]),
  width: 1,
  height: 1,
  scale: 1,
  selectedTile: 0x80,
  showGrid: true
});
assert.ok(overlayOnlyCtx.calls.some((call) => call.kind === "strokeRect"));
assert.ok(overlayOnlyCtx.calls.some((call) => call.kind === "stroke"));

const overscanCtx = makeContext();
renderTileGrid(overscanCtx, {
  bytes: Uint8Array.from([0x80]),
  width: 1,
  height: 1,
  patternBytes: pattern,
  baseTile: 0x80,
  screenX: 0,
  scale: 1,
  showGrid: false,
  showOverscan: true
});
assert.ok(overscanCtx.calls.some((call) => call.kind === "fill" && call.style === "rgba(0,0,0,0.52)" && call.w === 8));

const shiftedOverscanCtx = makeContext();
renderTileGrid(shiftedOverscanCtx, {
  bytes: Uint8Array.from([0x80]),
  width: 1,
  height: 1,
  patternBytes: pattern,
  baseTile: 0x80,
  screenX: 1,
  scale: 1,
  showGrid: false,
  showOverscan: true
});
assert.equal(shiftedOverscanCtx.calls.some((call) => call.kind === "fill" && call.style === "rgba(0,0,0,0.52)"), false);

console.log("graphics TMS9918 renderer tests passed");