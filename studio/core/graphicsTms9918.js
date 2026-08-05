export const TMS9918_PALETTE = [
  "#000000", "#000000", "#21c842", "#5edc78",
  "#5455ed", "#7d76fc", "#d4524d", "#42ebf5",
  "#fc5554", "#ff7978", "#d4c154", "#e5ce80",
  "#21b03b", "#c95aa9", "#cccccc", "#ffffff"
];

export function tmsColor(palette, nibble) {
  const colors = Array.isArray(palette) && palette.length ? palette : TMS9918_PALETTE;
  return colors[Number(nibble) & 0x0F] || colors[0] || "#000000";
}

export function tilePatternBytesForValue(patternBytes, tileValue, baseTile) {
  const index = (Number(tileValue) & 0xFF) - (Number(baseTile) & 0xFF);
  if (index < 0) return null;
  const offset = index * 8;
  if (offset < 0 || offset + 8 > patternBytes.length) return null;
  return patternBytes.slice(offset, offset + 8);
}

export function tileColorOffsetForValue(colorBytes, tileValue, baseTile, screenTileY = 0) {
  if (!colorBytes || !colorBytes.length) return -1;
  const tile = Number(tileValue) & 0xFF;
  const base = Number(baseTile) & 0xFF;
  const y = Math.max(0, Number(screenTileY) || 0);
  let offset = colorBytes.length >= 6144
    ? Math.min(2, Math.floor(y / 8)) * 2048 + tile * 8
    : tile * 8;
  if (offset + 8 > colorBytes.length) {
    const index = tile - base;
    offset = index * 8;
  }
  return offset >= 0 && offset + 8 <= colorBytes.length ? offset : -1;
}

export function tileColorRowsForValue(colorBytes, patternBytes, tileValue, baseTile, screenTileY = 0) {
  if (colorBytes?.length === 32) {
    const colorByte = colorBytes[(Number(tileValue) & 0xFF) >> 3];
    return colorByte == null ? null : new Uint8Array(8).fill(colorByte);
  }
  const offset = tileColorOffsetForValue(colorBytes, tileValue, baseTile, screenTileY);
  return offset < 0 ? null : colorBytes.slice(offset, offset + 8);
}

export function drawTilePattern(ctx, pattern, x, y, scale, fg, bg, colorRows = null, palette = TMS9918_PALETTE) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, 8 * scale, 8 * scale);
  if (!pattern) return;
  for (let row = 0; row < 8; row += 1) {
    const colorByte = colorRows ? colorRows[row] : null;
    const rowFg = colorByte == null ? fg : tmsColor(palette, colorByte >> 4);
    const rowBg = colorByte == null ? bg : tmsColor(palette, colorByte);
    ctx.fillStyle = rowBg;
    ctx.fillRect(x, y + row * scale, 8 * scale, scale);
    ctx.fillStyle = rowFg;
    const bits = pattern[row] || 0;
    for (let col = 0; col < 8; col += 1) {
      if (bits & (0x80 >> col)) ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

export function drawTmsTileToContext(ctx, pattern, color, tileIndex, x, y, scale, options = {}) {
  const palette = options.palette || TMS9918_PALETTE;
  const base = tileIndex * 8;
  const fallbackColor = options.fallbackColor ?? 0xF0;
  ctx.imageSmoothingEnabled = false;
  for (let row = 0; row < 8; row += 1) {
    const bits = pattern[base + row] || 0;
    const packed = color[base + row] ?? fallbackColor;
    const fg = (packed >> 4) & 0x0F;
    const bg = packed & 0x0F;
    for (let bit = 0; bit < 8; bit += 1) {
      ctx.fillStyle = tmsColor(palette, (bits & (0x80 >> bit)) ? fg : bg);
      ctx.fillRect(x + bit * scale, y + row * scale, scale, scale);
    }
  }
}
function normalizeTileGridOptions(options = {}) {
  const width = Math.max(0, Number(options.width) || 0);
  const height = Math.max(0, Number(options.height) || 0);
  const scale = Math.max(1, Number(options.scale) || 1);
  return {
    bytes: options.bytes || new Uint8Array(),
    width,
    height,
    scale,
    patternBytes: options.patternBytes || new Uint8Array(),
    colorBytes: options.colorBytes || null,
    baseTile: Number(options.baseTile || 0) & 0xFF,
    blankTile: Number(options.blankTile ?? -1) & 0xFF,
    screenX: Math.max(0, Number(options.screenX) || 0),
    screenY: Math.max(0, Number(options.screenY) || 0),
    palette: options.palette || TMS9918_PALETTE,
    fallbackFg: options.fallbackFg || "#66a6ff",
    fallbackFgForTile: typeof options.fallbackFgForTile === "function" ? options.fallbackFgForTile : null,
    fallbackBg: options.fallbackBg || "#000000",
    selectedTile: options.selectedTile == null ? null : (Number(options.selectedTile) & 0xFF),
    highlightColor: options.highlightColor || "rgba(87,255,106,0.85)",
    gridColor: options.gridColor || "rgba(255,255,255,0.18)",
    showGrid: options.showGrid !== false,
    showOverscan: options.showOverscan === true
  };
}

export function renderTileGrid(ctx, options = {}) {
  const opts = normalizeTileGridOptions(options);
  const {
    bytes, width, height, scale, patternBytes, colorBytes, baseTile, blankTile,
    screenY, palette, fallbackFg, fallbackFgForTile, fallbackBg
  } = opts;

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = fallbackBg;
  ctx.fillRect(0, 0, width * 8 * scale, height * 8 * scale);

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const value = bytes[row * width + col] || 0;
      const pattern = tilePatternBytesForValue(patternBytes, value, baseTile);
      const colors = tileColorRowsForValue(colorBytes, patternBytes, value, baseTile, screenY + row);
      const fg = value === blankTile ? fallbackBg : (fallbackFgForTile ? fallbackFgForTile(value, col, row) : fallbackFg);
      drawTilePattern(ctx, pattern, col * 8 * scale, row * 8 * scale, scale, fg, fallbackBg, colors, palette);
    }
  }

  drawTileGridEditorOverlay(ctx, opts);
}

export function drawTileGridEditorOverlay(ctx, options = {}) {
  const opts = normalizeTileGridOptions(options);
  const {
    bytes, width, height, scale, selectedTile, highlightColor, gridColor,
    screenX, showGrid, showOverscan
  } = opts;

  if (selectedTile != null) {
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 2;
    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        if ((bytes[row * width + col] & 0xFF) === selectedTile) {
          ctx.strokeRect(col * 8 * scale + 1, row * 8 * scale + 1, 8 * scale - 2, 8 * scale - 2);
        }
      }
    }
  }

  if (showGrid) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let col = 0; col <= width; col += 1) {
      ctx.beginPath();
      ctx.moveTo(col * 8 * scale + 0.5, 0);
      ctx.lineTo(col * 8 * scale + 0.5, height * 8 * scale);
      ctx.stroke();
    }
    for (let row = 0; row <= height; row += 1) {
      ctx.beginPath();
      ctx.moveTo(0, row * 8 * scale + 0.5);
      ctx.lineTo(width * 8 * scale, row * 8 * scale + 0.5);
      ctx.stroke();
    }
  }

  if (showOverscan) {
    const hiddenScreenPixels = 8;
    const localHiddenPixels = hiddenScreenPixels - screenX * 8;
    if (localHiddenPixels > 0) {
      const hiddenWidth = Math.min(width * 8, localHiddenPixels) * scale;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.52)";
      ctx.fillRect(0, 0, hiddenWidth, height * 8 * scale);
      ctx.strokeStyle = "rgba(255,220,80,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hiddenWidth + 0.5, 0);
      ctx.lineTo(hiddenWidth + 0.5, height * 8 * scale);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,220,80,0.95)";
      ctx.font = Math.max(10, 4 * scale) + "px monospace";
      ctx.fillText("CRT hidden", 4, Math.max(12, 5 * scale));
      ctx.restore();
    }
  }
}
