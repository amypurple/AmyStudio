#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  PREVIEW_FILTERS,
  applyGraphicsPreviewFilter,
  normalizePreviewFilter
} from "../studio/core/graphicsPreviewFilters.js";

// A recording 2D context. `canvas` is the element it belongs to.
function makeCtx(canvas) {
  const calls = [];
  const ctx = {
    canvas,
    fillStyle: "",
    globalAlpha: 1,
    filter: "none",
    calls,
    save() { calls.push({ k: "save" }); },
    restore() { calls.push({ k: "restore" }); },
    clearRect(x, y, w, h) { calls.push({ k: "clear", x, y, w, h }); },
    fillRect(x, y, w, h) { calls.push({ k: "fill", style: this.fillStyle, x, y, w, h }); },
    drawImage(img, dx, dy, w, h) { calls.push({ k: "drawImage", dx, dy, w, h }); },
    getImageData(x, y, w, h) {
      calls.push({ k: "getImageData", x, y, w, h });
      const data = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < data.length; i += 4) data[i + 3] = 255;
      if (canvas.__pixels) data.set(canvas.__pixels.slice(0, data.length));
      return { data, width: w, height: h };
    },
    putImageData(image, x, y) {
      calls.push({ k: "putImageData", x, y, data: new Uint8ClampedArray(image.data) });
      canvas.__pixels = new Uint8ClampedArray(image.data);
    },
    createRadialGradient() { return { addColorStop() {} }; }
  };
  return ctx;
}
function makeCanvas(w, h) {
  const canvas = { width: w, height: h };
  canvas.getContext = () => (canvas.__ctx || (canvas.__ctx = makeCtx(canvas)));
  return canvas;
}
// Visible canvas + its recording ctx (ctx.canvas === visible canvas).
function makeVisible(w, h) {
  const canvas = makeCanvas(w, h);
  return canvas.getContext();
}

// Toggle offscreen availability by (un)defining a minimal global document.
function withOffscreen(available, fn) {
  const had = Object.prototype.hasOwnProperty.call(globalThis, "document");
  const prev = globalThis.document;
  if (available) globalThis.document = { createElement: () => makeCanvas(1, 1) };
  else if (had) delete globalThis.document;
  try { return fn(); }
  finally {
    if (had) globalThis.document = prev;
    else delete globalThis.document;
  }
}

const drawImageCount = (ctx) => ctx.calls.filter((c) => c.k === "drawImage").length;
const fillCount = (ctx) => ctx.calls.filter((c) => c.k === "fill").length;

// normalizePreviewFilter
assert.deepEqual(PREVIEW_FILTERS, ["clean", "rf", "composite", "crt-tv", "crt-monitor"]);
assert.equal(normalizePreviewFilter("CRT-TV"), "crt-tv");
assert.equal(normalizePreviewFilter("  rf "), "rf");
assert.equal(normalizePreviewFilter("bogus"), "clean");
assert.equal(normalizePreviewFilter(null), "clean");

// clean does not draw
{
  const ctx = makeVisible(152, 168);
  assert.equal(applyGraphicsPreviewFilter(ctx, 152, 168, { filter: "clean", scale: 3 }), "clean");
  assert.equal(ctx.calls.length, 0, "clean must not draw");
}

// unknown filter -> clean (and draws nothing)
{
  const ctx = makeVisible(152, 168);
  assert.equal(applyGraphicsPreviewFilter(ctx, 152, 168, { filter: "nope", scale: 3 }), "clean");
  assert.equal(ctx.calls.length, 0, "unknown filter must normalize to clean no-op");
}

// zero-size canvas is safe
{
  const ctx = makeVisible(0, 0);
  applyGraphicsPreviewFilter(ctx, 0, 0, { filter: "crt-tv", scale: 3 });
  assert.equal(ctx.calls.length, 0, "zero-size canvas must not draw");
}

// non-clean tries image-copy processing when canvas/drawImage/offscreen available
withOffscreen(true, () => {
  const ctx = makeVisible(152, 168);
  applyGraphicsPreviewFilter(ctx, 152, 168, { filter: "composite", scale: 3 });
  assert.ok(drawImageCount(ctx) > 0, "composite must sample/redraw the snapshot via drawImage");
  assert.ok(ctx.calls.some((c) => c.k === "clear"), "image-copy path should reset the visible canvas");
});

// graceful fallback: no offscreen -> no image copy, but overlay passes still draw
withOffscreen(false, () => {
  const ctx = makeVisible(152, 168);
  applyGraphicsPreviewFilter(ctx, 152, 168, { filter: "crt-tv", screenX: 0, scale: 3 });
  assert.equal(drawImageCount(ctx), 0, "no offscreen -> no image-copy drawImage");
  assert.ok(fillCount(ctx) > 0, "overlay fallback must still draw scanlines/mask/vignette");
});

// RF does more processing/draw calls than composite (both with offscreen available)
withOffscreen(true, () => {
  const rf = makeVisible(152, 168);
  const comp = makeVisible(152, 168);
  applyGraphicsPreviewFilter(rf, 152, 168, { filter: "rf", scale: 3 });
  applyGraphicsPreviewFilter(comp, 152, 168, { filter: "composite", scale: 3 });
  assert.ok(drawImageCount(rf) > drawImageCount(comp), "rf must use more ghost taps than composite");
  assert.ok(rf.calls.length > comp.calls.length, "rf must do more total processing than composite");
});

// crt-tv is a signal/display filter, not the CRT-left-hidden toggle.
// Overscan is tested in test-graphics-tms9918.mjs via renderTileGrid(showOverscan).
withOffscreen(true, () => {
  const ctx = makeVisible(152, 168);
  applyGraphicsPreviewFilter(ctx, 152, 168, { filter: "crt-tv", screenX: 0, scale: 3 });
  assert.equal(ctx.calls.some((c) => c.style === "rgba(0,0,0,0.34)"), false,
    "crt-tv filter must not force the hidden-left overscan strip");
});

// crt-monitor is sharper (smaller blur) and has no consumer-TV slot mask
withOffscreen(true, () => {
  const ctx = makeVisible(152, 168);
  applyGraphicsPreviewFilter(ctx, 152, 168, { filter: "crt-monitor", scale: 3 });
  assert.ok(drawImageCount(ctx) > 0, "crt-monitor must still process the image");
});

// deterministic: rf produces identical calls across runs (normalize gradient objects)
withOffscreen(true, () => {
  const a = makeVisible(152, 168);
  const b = makeVisible(152, 168);
  applyGraphicsPreviewFilter(a, 152, 168, { filter: "rf", scale: 3 });
  applyGraphicsPreviewFilter(b, 152, 168, { filter: "rf", scale: 3 });
  const norm = (calls) => calls.map((c) => ({ ...c, style: typeof c.style === "object" ? "[grad]" : c.style }));
  assert.deepEqual(norm(a.calls), norm(b.calls), "rf overlay+process must be deterministic (no Math.random)");
});

// phosphor response: one isolated white pixel should not remain neutral white.
withOffscreen(true, () => {
  const ctx = makeVisible(3, 1);
  ctx.canvas.__pixels = Uint8ClampedArray.from([
    255, 255, 255, 255,
    0, 0, 0, 255,
    0, 0, 0, 255
  ]);
  applyGraphicsPreviewFilter(ctx, 3, 1, { filter: "crt-tv", scale: 3 });
  const imageCall = ctx.calls.find((c) => c.k === "putImageData");
  assert.ok(imageCall, "crt-tv should apply phosphor ImageData response when available");
  const [r, g, b] = imageCall.data;
  assert.ok(r > g && g > b, "single white pixel at phase 0 should lean red/yellow, not neutral white");
});

console.log("graphics preview filters tests passed");
