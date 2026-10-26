export const CRT_TELEVISION_WIDTH = 640;
export const CRT_TELEVISION_HEIGHT = 448;
export const CRT_TELEVISION_RENDER_SCALE = 2;

export function getCrtTelevisionGeometry(region = "ntsc", cabinet = "television") {
  const verticalBorderTop = region === "pal" ? 54 : 27;
  const verticalBorderBottom = region === "pal" ? 48 : 24;
  const cropTop = verticalBorderTop - 11;
  const cropBottom = verticalBorderBottom - 11;
  const horizontalBorder = 14;
  // The calibrated OS7 menu photograph keeps nearly the complete active row
  // through the tube centre. Most loss occurs progressively in rounded corners.
  const hiddenActiveColumnsLeft = cabinet === "adam" ? 7 : 3;
  const hiddenActiveColumnsRight = 3;
  const cropLeft = horizontalBorder + hiddenActiveColumnsLeft;
  const cropRight = horizontalBorder + hiddenActiveColumnsRight;
  return Object.freeze({
    activeWidth: 256,
    activeHeight: 192,
    horizontalBorder,
    verticalBorder: verticalBorderTop,
    verticalBorderTop,
    verticalBorderBottom,
    rasterWidth: 284,
    rasterHeight: 192 + verticalBorderTop + verticalBorderBottom,
    cropX: cropLeft,
    cropLeft,
    cropRight,
    cropY: cropTop,
    cropTop,
    cropBottom,
    sourceWidth: 284 - cropLeft - cropRight,
    sourceHeight: 192 + verticalBorderTop + verticalBorderBottom - cropTop - cropBottom,
    firstVisibleActiveColumn: hiddenActiveColumnsLeft,
    lastVisibleActiveColumn: 255 - hiddenActiveColumnsRight,
    visibleActiveColumns: 256 - hiddenActiveColumnsLeft - hiddenActiveColumnsRight,
    visibleActiveRows: 192
  });
}

const TELEVISION_SCREEN = Object.freeze({ x: 30, y: 38, width: 472, height: 354 });
const ADAM_MONITOR_SCREEN = Object.freeze({ x: 54, y: 34, width: 532, height: 376 });
const rasterCache = new WeakMap();
const horizontalWarpCache = new WeakMap();
const cabinetCache = new Map();
const opticalOverlayCache = new Map();
const persistenceCache = new WeakMap();

export const DEFAULT_CRT_EFFECTS = Object.freeze({
  phosphorDecay: 12,
  phosphorMask: 20,
  phosphorGlow: 15
});

export function normalizeCrtEffects(options = {}) {
  const percent = (value, fallback) => Math.max(0, Math.min(100,
    Number.isFinite(Number(value)) ? Number(value) : fallback));
  return {
    phosphorDecay: percent(options.phosphorDecay, DEFAULT_CRT_EFFECTS.phosphorDecay),
    phosphorMask: percent(options.phosphorMask, DEFAULT_CRT_EFFECTS.phosphorMask),
    phosphorGlow: percent(options.phosphorGlow, DEFAULT_CRT_EFFECTS.phosphorGlow)
  };
}

export function resetCrtTelevisionPersistence(target) {
  if (target) persistenceCache.delete(target);
}
const TMS9918_COLORS = Object.freeze([
  "#000000", "#000000", "#21c842", "#5edc78",
  "#5455ed", "#7d76fc", "#d4524d", "#42ebf5",
  "#fc5554", "#ff7978", "#d4c154", "#e6ce80",
  "#21b03b", "#c95bba", "#cccccc", "#ffffff"
]);

function roundedScreenPath(context, screen) {
  const { x, y, width, height } = screen;
  context.beginPath();
  context.moveTo(x + 30, y);
  context.quadraticCurveTo(x, y + 5, x, y + 31);
  context.lineTo(x, y + height - 29);
  context.quadraticCurveTo(x + 5, y + height, x + 31, y + height);
  context.lineTo(x + width - 31, y + height);
  context.quadraticCurveTo(x + width, y + height - 5, x + width, y + height - 31);
  context.lineTo(x + width, y + 31);
  context.quadraticCurveTo(x + width - 5, y, x + width - 30, y);
  context.closePath();
}

function drawAdamMonitor(context) {
  const shell = context.createLinearGradient(0, 0, 0, CRT_TELEVISION_HEIGHT);
  shell.addColorStop(0, "#e6e5d7");
  shell.addColorStop(0.72, "#c8c8bd");
  shell.addColorStop(0.73, "#aaa99f");
  shell.addColorStop(1, "#77776f");
  context.fillStyle = shell;
  context.fillRect(0, 0, CRT_TELEVISION_WIDTH, CRT_TELEVISION_HEIGHT);
  context.strokeStyle = "#f4f2e5";
  context.lineWidth = 4;
  context.strokeRect(4, 4, CRT_TELEVISION_WIDTH - 8, CRT_TELEVISION_HEIGHT - 8);

  context.fillStyle = "#090d0e";
  context.beginPath();
  context.roundRect(33, 19, 574, 405, 8);
  context.fill();
  context.strokeStyle = "#4e5452";
  context.lineWidth = 2;
  context.stroke();

  const control = context.createLinearGradient(0, 421, 0, 445);
  control.addColorStop(0, "#151918");
  control.addColorStop(0.55, "#020303");
  control.addColorStop(1, "#252a29");
  context.fillStyle = control;
  context.beginPath();
  context.roundRect(337, 420, 252, 23, 12);
  context.fill();
  const slider = context.createRadialGradient(565, 429, 1, 565, 431, 14);
  slider.addColorStop(0, "#eef0e9");
  slider.addColorStop(0.35, "#aeb5b2");
  slider.addColorStop(0.75, "#555d5c");
  slider.addColorStop(1, "#171b1b");
  context.fillStyle = slider;
  context.beginPath();
  context.ellipse(566, 431, 19, 10, 0, 0, Math.PI * 2);
  context.fill();
}

function drawCabinet(context) {
  const cabinet = context.createLinearGradient(0, 0, 0, CRT_TELEVISION_HEIGHT);
  cabinet.addColorStop(0, "#aaa894");
  cabinet.addColorStop(0.12, "#74756a");
  cabinet.addColorStop(0.84, "#4a4d46");
  cabinet.addColorStop(1, "#252a28");
  context.fillStyle = cabinet;
  context.fillRect(0, 0, CRT_TELEVISION_WIDTH, CRT_TELEVISION_HEIGHT);
  context.strokeStyle = "#d5d0b7";
  context.lineWidth = 4;
  context.strokeRect(4, 4, CRT_TELEVISION_WIDTH - 8, CRT_TELEVISION_HEIGHT - 8);

  context.fillStyle = "#171b1a";
  context.fillRect(516, 19, 105, 410);
  context.strokeStyle = "#777a70";
  context.lineWidth = 3;
  context.strokeRect(516, 19, 105, 410);
  context.fillStyle = "#88897d";
  context.fillRect(528, 31, 81, 128);

  for (const [y, radius] of [[62, 22], [118, 19]]) {
    const knob = context.createRadialGradient(546, y - 7, 3, 565, y, radius);
    knob.addColorStop(0, "#f0eee0");
    knob.addColorStop(0.35, "#a7a79b");
    knob.addColorStop(0.72, "#555a56");
    knob.addColorStop(1, "#1d2221");
    context.fillStyle = knob;
    context.beginPath();
    context.arc(568, y, radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#202524";
    context.lineWidth = 2;
    context.stroke();
    context.strokeStyle = "#292e2c";
    context.beginPath();
    context.moveTo(568, y);
    context.lineTo(568 + radius - 5, y - 7);
    context.stroke();
  }

  context.fillStyle = "#373c39";
  context.fillRect(531, 165, 75, 245);
  context.strokeStyle = "#161a19";
  context.lineWidth = 2;
  for (let y = 174; y < 403; y += 8) {
    context.beginPath();
    context.moveTo(537, y);
    context.lineTo(600, y);
    context.stroke();
  }
  for (let x = 541; x < 600; x += 9) {
    context.beginPath();
    context.moveTo(x, 171);
    context.lineTo(x, 405);
    context.stroke();
  }
}

function cachedCabinet(cabinet, renderScale) {
  const key = `${cabinet}:${renderScale}`;
  let canvas = cabinetCache.get(key);
  if (canvas) return canvas;
  canvas = document.createElement("canvas");
  canvas.width = CRT_TELEVISION_WIDTH * renderScale;
  canvas.height = CRT_TELEVISION_HEIGHT * renderScale;
  const context = canvas.getContext("2d", { alpha: false });
  context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  if (cabinet === "adam") drawAdamMonitor(context);
  else drawCabinet(context);
  cabinetCache.set(key, canvas);
  return canvas;
}

function cachedOpticalOverlay(screen, adamMonitor, renderScale, phosphorMask) {
  const mask = Math.round(phosphorMask * 10) / 10;
  const key = `${screen.width}x${screen.height}:${adamMonitor ? "adam" : "television"}:${renderScale}:${mask}`;
  let canvas = opticalOverlayCache.get(key);
  if (canvas) return canvas;
  canvas = document.createElement("canvas");
  canvas.width = screen.width * renderScale;
  canvas.height = screen.height * renderScale;
  const context = canvas.getContext("2d");
  const maskStrength = mask / 100;
  if (maskStrength > 0) {
    const stripe = 3 * renderScale;
    for (let x = 0; x < canvas.width; x += stripe) {
      context.fillStyle = `rgba(255,70,55,${0.09 * maskStrength})`;
      context.fillRect(x, 0, renderScale, canvas.height);
      context.fillStyle = `rgba(70,255,90,${0.07 * maskStrength})`;
      context.fillRect(x + renderScale, 0, renderScale, canvas.height);
      context.fillStyle = `rgba(70,110,255,${0.09 * maskStrength})`;
      context.fillRect(x + renderScale * 2, 0, renderScale, canvas.height);
    }
  }
  if (adamMonitor) {
    context.fillStyle = "rgba(24,72,255,.035)";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const vignette = context.createRadialGradient(centerX, centerY, 90 * renderScale,
    centerX, centerY, Math.max(canvas.width, canvas.height) * 0.61);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.72, "rgba(0,0,0,.04)");
  vignette.addColorStop(1, "rgba(0,0,0,.55)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, canvas.width, canvas.height);
  opticalOverlayCache.set(key, canvas);
  return canvas;
}

function virtualTmsRaster(target, source, { backdropIndex = 1, region = "ntsc" } = {}) {
  let raster = rasterCache.get(target);
  if (!raster) {
    raster = document.createElement("canvas");
    rasterCache.set(target, raster);
  }
  const geometry = getCrtTelevisionGeometry(region);
  if (raster.width !== geometry.rasterWidth) raster.width = geometry.rasterWidth;
  if (raster.height !== geometry.rasterHeight) raster.height = geometry.rasterHeight;
  const context = raster.getContext("2d", { alpha: false });
  context.fillStyle = TMS9918_COLORS[backdropIndex & 0x0F];
  context.fillRect(0, 0, raster.width, raster.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(source, geometry.horizontalBorder, geometry.verticalBorderTop,
    geometry.activeWidth, geometry.activeHeight);
  return raster;
}

function drawCurvedPicture(context, source, options, screen, renderScale = 1) {
  const raster = virtualTmsRaster(context.canvas, source, options);
  // Skip the VDP border and only a small permanent active margin. The rounded
  // aperture below provides the larger, row-dependent loss seen near corners.
  const geometry = getCrtTelevisionGeometry(options?.region, options?.cabinet);
  const { cropLeft, cropY, sourceWidth, sourceHeight } = geometry;
  const adamMonitor = options?.cabinet === "adam";
  const effects = normalizeCrtEffects(options);
  const horizontalCurve = adamMonitor ? 4 : 5;
  const verticalCurve = adamMonitor ? 2.5 : 3.5;
  // The source raster has no more vertical detail than its scanline count.
  // Rendering one strip per output subpixel only duplicated work at 2x.
  const rowSlices = sourceHeight;
  let horizontalWarp = horizontalWarpCache.get(context.canvas);
  if (!horizontalWarp) {
    horizontalWarp = document.createElement("canvas");
    horizontalWarpCache.set(context.canvas, horizontalWarp);
  }
  const warpWidth = screen.width * renderScale;
  const warpHeight = screen.height * renderScale;
  if (horizontalWarp.width !== warpWidth) horizontalWarp.width = warpWidth;
  if (horizontalWarp.height !== warpHeight) horizontalWarp.height = warpHeight;
  const warpContext = horizontalWarp.getContext("2d", { alpha: false });
  warpContext.fillStyle = "#010303";
  warpContext.fillRect(0, 0, horizontalWarp.width, horizontalWarp.height);
  warpContext.imageSmoothingEnabled = true;

  // First pass: spherical horizontal curvature. The top and bottom rows become
  // slightly narrower, bending vertical edges without angular corner seams.
  for (let slice = 0; slice < rowSlices; slice += 1) {
    const normalizedY = (slice + 0.5) / rowSlices * 2 - 1;
    const inset = Math.round(horizontalCurve * renderScale * normalizedY * normalizedY);
    const destinationY = Math.floor(slice * horizontalWarp.height / rowSlices);
    const nextY = Math.ceil((slice + 1) * horizontalWarp.height / rowSlices);
    const sourceY = cropY + Math.floor(slice * sourceHeight / rowSlices);
    const nextSourceY = cropY + Math.ceil((slice + 1) * sourceHeight / rowSlices);
    warpContext.drawImage(raster,
      cropLeft, sourceY, sourceWidth, Math.max(1, nextSourceY - sourceY),
      inset, destinationY, horizontalWarp.width - inset * 2, Math.max(1, nextY - destinationY));
  }

  context.save();
  roundedScreenPath(context, screen);
  context.clip();
  context.fillStyle = "#010303";
  context.fillRect(screen.x, screen.y, screen.width, screen.height);
  context.imageSmoothingEnabled = true;
  context.filter = adamMonitor ? "none" : "saturate(1.04)";

  // Second pass: matching vertical curvature. Horizontal lines now bow near
  // both side edges instead of remaining implausibly ruler-straight.
  const columnSlices = geometry.visibleActiveColumns;
  for (let slice = 0; slice < columnSlices; slice += 1) {
    const sourceX = Math.floor(slice * horizontalWarp.width / columnSlices);
    const nextSourceX = Math.ceil((slice + 1) * horizontalWarp.width / columnSlices);
    const normalizedX = (slice + 0.5) / columnSlices * 2 - 1;
    const inset = verticalCurve * normalizedX * normalizedX;
    context.drawImage(horizontalWarp,
      sourceX, 0, Math.max(1, nextSourceX - sourceX), horizontalWarp.height,
      screen.x + sourceX / renderScale, screen.y + inset,
      Math.max(1, nextSourceX - sourceX) / renderScale, screen.height - inset * 2);
  }
  context.filter = "none";

  if (effects.phosphorGlow > 0) {
    context.save();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = effects.phosphorGlow / 250;
    context.filter = `blur(${1 + effects.phosphorGlow * 0.045}px)`;
    context.drawImage(horizontalWarp, screen.x, screen.y, screen.width, screen.height);
    context.restore();
  }

  // This is optional analogue left-edge ringing/phase smear, not the TMS9918A
  // sprite Early Clock bit. Early Clock moves a sprite 32 active pixels left.
  context.save();
  context.globalCompositeOperation = "screen";
  context.globalAlpha = 0.22;
  context.filter = "blur(3px)";
  context.drawImage(raster, cropLeft, cropY, 3, sourceHeight,
    screen.x - 3, screen.y + 8, 10, screen.height - 16);
  context.restore();

  // Cache the static phosphor mask, monitor tint and vignette as one overlay.
  context.drawImage(cachedOpticalOverlay(screen, adamMonitor, renderScale, effects.phosphorMask),
    screen.x, screen.y, screen.width, screen.height);
  context.restore();

  context.save();
  roundedScreenPath(context, screen);
  context.strokeStyle = "#111817";
  context.lineWidth = 12;
  context.stroke();
  context.strokeStyle = "rgba(220,225,205,.35)";
  context.lineWidth = 2;
  context.stroke();
  context.restore();
}

export function renderCrtTelevision(target, source, options = {}) {
  if (!target || !source) return;
  const renderScale = Math.max(1, options.renderScale || CRT_TELEVISION_RENDER_SCALE);
  const targetWidth = CRT_TELEVISION_WIDTH * renderScale;
  const targetHeight = CRT_TELEVISION_HEIGHT * renderScale;
  if (target.width !== targetWidth) target.width = targetWidth;
  if (target.height !== targetHeight) target.height = targetHeight;
  const context = target.getContext("2d", { alpha: false });
  if (options.resetPersistence) resetCrtTelevisionPersistence(target);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, target.width, target.height);
  const adamMonitor = options.cabinet === "adam";
  const screen = adamMonitor ? ADAM_MONITOR_SCREEN : TELEVISION_SCREEN;
  context.drawImage(cachedCabinet(adamMonitor ? "adam" : "television", renderScale), 0, 0);
  context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  drawCurvedPicture(context, source, options, screen, renderScale);

  const effects = normalizeCrtEffects(options);
  const previous = persistenceCache.get(target);
  if (previous && effects.phosphorDecay > 0) {
    context.save();
    roundedScreenPath(context, screen);
    context.clip();
    context.globalAlpha = effects.phosphorDecay * 0.008;
    context.drawImage(previous,
      screen.x * renderScale, screen.y * renderScale, screen.width * renderScale, screen.height * renderScale,
      screen.x, screen.y, screen.width, screen.height);
    context.restore();
  }
  if (effects.phosphorDecay <= 0) {
    persistenceCache.delete(target);
    return;
  }
  let history = previous;
  if (!history || history.width !== target.width || history.height !== target.height) {
    history = document.createElement("canvas");
    history.width = target.width;
    history.height = target.height;
    persistenceCache.set(target, history);
  }
  const historyContext = history.getContext("2d", { alpha: false });
  historyContext.setTransform(1, 0, 0, 1, 0, 0);
  historyContext.drawImage(target, 0, 0);
}
