// Optional, purely-visual preview filters for the Amy Studio graphics editors.
//
// Pipeline (closer to GearColeco's shader-chain idea than a flat overlay):
//   1. the caller has already drawn the clean tilemap onto the visible canvas;
//   2. we snapshot that clean canvas into an offscreen canvas;
//   3. we rebuild the visible canvas by sampling/redrawing the offscreen image
//      (horizontal blur + ghost taps = signal bleed acting on real pixels);
//   4. the processed result is now on the visible canvas;
//   5. we then draw display-only overlays (scanlines, slot mask, aperture
//      grille, vignette) on top. Overscan is controlled by the editor toggle.
//
// Never touches pattern/color/name bytes, source, or save output. Deterministic
// (no Math.random) so it is testable. "clean" is a no-op. If neither
// OffscreenCanvas nor document.createElement is available (e.g. headless tests),
// step 2-4 is skipped and only the overlay passes run as a graceful fallback.

export const PREVIEW_FILTERS = ["clean", "rf", "composite", "crt-tv", "crt-monitor"];


// Per-filter parameters. `taps` are deterministic horizontal ghost offsets that
// reconstruct colour bleed from the sampled image; more taps = more processing.
const PROFILES = {
  composite: {
    blur: 0.6,
    taps: [{ dx: 1, alpha: 0.10 }, { dx: -1, alpha: 0.06 }],
    phosphor: 0.22,
    scanAlpha: 0.11,
    aperture: 0.020,
    vignette: 0.15
  },
  rf: {
    blur: 1.1,
    taps: [{ dx: 2, alpha: 0.16 }, { dx: -2, alpha: 0.11 }, { dx: 3, alpha: 0.06 }],
    phosphor: 0.48,
    scanAlpha: 0.21,
    noise: 0.17,
    slotMask: 0.080,
    vignette: 0.21
  },
  "crt-tv": {
    blur: 0.75,
    taps: [{ dx: 1, alpha: 0.12 }, { dx: -1, alpha: 0.08 }],
    phosphor: 0.42,
    scanAlpha: 0.18,
    slotMask: 0.110,
    vignette: 0.30
  },
  "crt-monitor": {
    blur: 0.30,
    taps: [{ dx: 1, alpha: 0.05 }],
    phosphor: 0.30,
    scanAlpha: 0.13,
    aperture: 0.046,
    vignette: 0.20
  }
};

export function normalizePreviewFilter(value) {
  const v = String(value == null ? "" : value).trim().toLowerCase();
  return PREVIEW_FILTERS.includes(v) ? v : "clean";
}

function createOffscreenCanvas(w, h) {
  if (typeof OffscreenCanvas === "function") {
    try { return new OffscreenCanvas(w, h); } catch (_) { /* fall through */ }
  }
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }
  return null;
}

// Steps 2-4: snapshot the clean visible canvas and redraw it with horizontal
// blur + ghost taps. Returns true if the image-copy post-process ran, false if
// the environment cannot snapshot (overlay-only fallback then applies).
function processSignalBleed(ctx, w, h, profile) {
  const source = ctx.canvas;
  if (!source || typeof ctx.drawImage !== "function") return false;
  const off = createOffscreenCanvas(w, h);
  if (!off) return false;
  const offCtx = typeof off.getContext === "function" ? off.getContext("2d") : null;
  if (!offCtx || typeof offCtx.drawImage !== "function") return false;

  // Snapshot the clean render.
  offCtx.drawImage(source, 0, 0, w, h);

  // Rebuild the visible canvas from the snapshot.
  ctx.save();
  ctx.globalAlpha = 1;
  const canFilter = "filter" in ctx;
  if (typeof ctx.clearRect === "function") ctx.clearRect(0, 0, w, h);
  if (canFilter) ctx.filter = profile.blur > 0 ? "blur(" + profile.blur + "px)" : "none";
  ctx.drawImage(off, 0, 0, w, h);              // softened base
  if (canFilter) ctx.filter = "none";
  for (const tap of profile.taps || []) {      // horizontal ghost taps (colour bleed)
    ctx.globalAlpha = tap.alpha;
    ctx.drawImage(off, tap.dx, 0, w, h);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  return true;
}


function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function applyPhosphorResponse(ctx, w, h, strength) {
  // Optional high-fidelity path. It modifies only the preview canvas pixels, not
  // project data. The x%3 phase approximates where the beam lands on RGB groups:
  // a single white source pixel can look reddish/yellowish instead of white,
  // while adjacent lit pixels visually combine closer to white.
  if (strength <= 0 || typeof ctx.getImageData !== "function" || typeof ctx.putImageData !== "function") return false;
  let image;
  try { image = ctx.getImageData(0, 0, w, h); } catch (_) { return false; }
  if (!image || !image.data || image.data.length < w * h * 4) return false;
  const src = new Uint8ClampedArray(image.data);
  const dst = image.data;
  const phaseWeights = [
    [1.28, 0.34, 0.05],
    [0.74, 1.18, 0.08],
    [0.10, 0.38, 1.14]
  ];
  const keep = 1 - strength;
  const lumaBleed = strength * 0.22;
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      const i = (row + x) * 4;
      const left = (row + Math.max(0, x - 1)) * 4;
      const right = (row + Math.min(w - 1, x + 1)) * 4;
      const weights = phaseWeights[x % 3];
      const rBeam = src[i] * 0.70 + src[left] * 0.20 + src[right] * 0.10;
      const gBeam = src[i + 1] * 0.66 + src[left + 1] * 0.17 + src[right + 1] * 0.17;
      const bBeam = src[i + 2] * 0.72 + src[left + 2] * 0.08 + src[right + 2] * 0.20;
      const luma = rBeam * 0.30 + gBeam * 0.59 + bBeam * 0.11;
      dst[i] = clampByte(src[i] * keep + (rBeam * weights[0] + luma * lumaBleed) * strength);
      dst[i + 1] = clampByte(src[i + 1] * keep + (gBeam * weights[1] + luma * lumaBleed) * strength);
      dst[i + 2] = clampByte(src[i + 2] * keep + (bBeam * weights[2] + luma * lumaBleed) * strength);
    }
  }
  ctx.putImageData(image, 0, 0);
  return true;
}

function drawScanlines(ctx, w, h, scale, alpha) {
  const period = Math.max(2, Math.round(scale));
  ctx.fillStyle = "rgba(0,0,0," + alpha + ")";
  for (let y = period - 1; y < h; y += period) ctx.fillRect(0, y, w, 1);
}

function drawApertureGrille(ctx, w, h, alpha) {
  const a = Number(alpha).toFixed(3);
  const colors = ["rgba(255,48,48," + a + ")", "rgba(60,255,90," + a + ")", "rgba(70,110,255," + a + ")"];
  for (let x = 0; x < w; x += 3) {
    ctx.fillStyle = colors[0];
    ctx.fillRect(x, 0, 1, h);
    if (x + 1 < w) { ctx.fillStyle = colors[1]; ctx.fillRect(x + 1, 0, 1, h); }
    if (x + 2 < w) { ctx.fillStyle = colors[2]; ctx.fillRect(x + 2, 0, 1, h); }
  }
}

function drawSlotMask(ctx, w, h, alpha) {
  ctx.fillStyle = "rgba(0,0,0," + alpha + ")";
  for (let y = 0; y < h; y += 2) {
    const start = ((y / 2) & 1) ? 1 : 0;
    for (let x = start; x < w; x += 3) ctx.fillRect(x, y, 1, 1);
  }
}

// Deterministic per-row value in [0,1) — no Math.random, stable across runs/tests.
function hash01(n) {
  let x = (n ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0;
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  return x / 0xffffffff;
}

function drawRfNoise(ctx, w, h, scale, alpha) {
  const step = Math.max(2, Math.round(scale));
  for (let y = 0; y < h; y += step) {
    const a = alpha * hash01(Math.floor(y / step));
    if (a < 0.012) continue;
    ctx.fillStyle = "rgba(0,0,0," + a.toFixed(3) + ")";
    ctx.fillRect(0, y, w, step);
  }
}

function drawVignette(ctx, w, h, strength) {
  if (typeof ctx.createRadialGradient === "function") {
    const cx = w / 2, cy = h / 2;
    const inner = Math.min(w, h) * 0.36;
    const outer = Math.hypot(w, h) / 2;
    const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0," + strength + ")");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const inset = Math.max(1, Math.round(Math.min(w, h) * 0.12));
  ctx.fillStyle = "rgba(0,0,0," + strength + ")";
  ctx.fillRect(0, 0, w, inset);
  ctx.fillRect(0, h - inset, w, inset);
  ctx.fillRect(0, 0, inset, h);
  ctx.fillRect(w - inset, 0, inset, h);
}

// Post-process the visible canvas. widthPx/heightPx are the canvas pixel size.
// options: filter, scale. Returns the normalized filter.
export function applyGraphicsPreviewFilter(ctx, widthPx, heightPx, options = {}) {
  const filter = normalizePreviewFilter(options.filter);
  if (filter === "clean") return filter;
  const w = Math.max(0, Number(widthPx) || 0);
  const h = Math.max(0, Number(heightPx) || 0);
  if (w <= 0 || h <= 0) return filter;
  const scale = Math.max(1, Number(options.scale) || 1);
  const profile = PROFILES[filter];
  if (!profile) return filter;

  ctx.save();

  // Steps 2-4: image-copy signal bleed (gracefully skipped if no offscreen).
  processSignalBleed(ctx, w, h, profile);
  applyPhosphorResponse(ctx, w, h, profile.phosphor || 0);

  // Step 5: display-only overlays.
  drawScanlines(ctx, w, h, scale, profile.scanAlpha);
  if (profile.slotMask) drawSlotMask(ctx, w, h, profile.slotMask);
  if (profile.aperture) drawApertureGrille(ctx, w, h, profile.aperture);
  if (profile.noise) drawRfNoise(ctx, w, h, scale, profile.noise);
  drawVignette(ctx, w, h, profile.vignette);

  ctx.restore();
  return filter;
}
