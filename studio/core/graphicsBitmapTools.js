export function bitmapViewportPoint(screenX, screenY, zoom = 1, leftTiles = 0, topTiles = 0) {
  const x = Math.max(0, Math.min(255, Math.floor(screenX)));
  const y = Math.max(0, Math.min(191, Math.floor(screenY)));
  const scale = Math.max(1, Number(zoom) || 1);
  return scale > 1
    ? { x: leftTiles * 8 + Math.floor(x / scale), y: topTiles * 8 + Math.floor(y / scale) }
    : { x, y };
}

export function bitmapAddress(x, y) {
  if (x < 0 || x >= 256 || y < 0 || y >= 192) return -1;
  return Math.floor(y / 8) * 256 + Math.floor(x / 8) * 8 + (y & 7);
}

export function bitmapPixel(pattern, color, x, y) {
  const address = bitmapAddress(x, y);
  if (address < 0) return 0;
  const bit = 0x80 >> (x & 7);
  const packed = color[address] || 0;
  return (pattern[address] & bit) ? ((packed >> 4) & 15) : (packed & 15);
}

export function paintBitmapPixel(pattern, color, x, y, selectedColor) {
  const address = bitmapAddress(x, y);
  if (address < 0) return false;
  const bit = 0x80 >> (x & 7);
  const rowPattern = pattern[address] || 0;
  const packed = color[address] || 0;
  const selected = Number(selectedColor) & 15;
  const fg = (packed >> 4) & 15;
  const bg = packed & 15;
  let nextPattern = rowPattern;
  let nextColor = packed;
  if (selected === fg) nextPattern |= bit;
  else if (selected === bg) nextPattern &= ~bit & 255;
  else if (rowPattern === 0) { nextPattern = bit; nextColor = (selected << 4) | bg; }
  else if (rowPattern === 255) { nextPattern = rowPattern & (~bit & 255); nextColor = (fg << 4) | selected; }
  else if (rowPattern & bit) nextColor = (selected << 4) | bg;
  else nextColor = (fg << 4) | selected;
  if (nextPattern === rowPattern && nextColor === packed) return false;
  pattern[address] = nextPattern;
  color[address] = nextColor;
  return true;
}

export function linePixels(x0, y0, x1, y1) {
  const points = [];
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let error = dx - dy;
  while (true) {
    points.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const twice = error * 2;
    if (twice > -dy) { error -= dy; x0 += sx; }
    if (twice < dx) { error += dx; y0 += sy; }
  }
  return points;
}

export function expandPixels(points, size = 1) {
  const width = Math.max(1, Math.floor(Number(size) || 1));
  const before = Math.floor((width - 1) / 2);
  const after = Math.ceil((width - 1) / 2);
  const unique = new Map();
  for (const [x, y] of points) {
    for (let py = y - before; py <= y + after; py += 1) {
      for (let px = x - before; px <= x + after; px += 1) {
        if (px >= 0 && px < 256 && py >= 0 && py < 192) unique.set(py * 256 + px, [px, py]);
      }
    }
  }
  return [...unique.values()];
}

export function rectanglePixels(x0, y0, x1, y1, filled = false, thickness = 1) {
  const left = Math.min(x0, x1), right = Math.max(x0, x1);
  const top = Math.min(y0, y1), bottom = Math.max(y0, y1);
  const edge = Math.max(1, Math.floor(Number(thickness) || 1));
  const points = [];
  for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) {
    if (filled || x - left < edge || right - x < edge || y - top < edge || bottom - y < edge) points.push([x, y]);
  }
  return points;
}

export function ellipsePixels(x0, y0, x1, y1, filled = false, thickness = 1) {
  const rx = Math.abs(x1 - x0), ry = Math.abs(y1 - y0);
  const edge = Math.max(1, Math.floor(Number(thickness) || 1));
  const innerRx = Math.max(0, rx - edge), innerRy = Math.max(0, ry - edge);
  const points = [];
  for (let y = y0 - ry; y <= y0 + ry; y += 1) for (let x = x0 - rx; x <= x0 + rx; x += 1) {
    const dx = (x - x0) / (rx || 1), dy = (y - y0) / (ry || 1);
    const distance = dx * dx + dy * dy;
    const innerDistance = innerRx && innerRy
      ? ((x - x0) / innerRx) ** 2 + ((y - y0) / innerRy) ** 2
      : Infinity;
    if (distance <= 1 && (filled || innerDistance >= 1)) points.push([x, y]);
  }
  return points;
}

export function floodBitmap(pattern, color, startX, startY, selectedColor) {
  const target = bitmapPixel(pattern, color, startX, startY);
  const selected = Number(selectedColor) & 15;
  if (target === selected) return 0;
  const queue = [[startX, startY]];
  const seen = new Uint8Array(256 * 192);
  let changed = 0;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    if (x < 0 || x >= 256 || y < 0 || y >= 192) continue;
    const index = y * 256 + x;
    if (seen[index]) continue;
    seen[index] = 1;
    if (bitmapPixel(pattern, color, x, y) !== target) continue;
    if (paintBitmapPixel(pattern, color, x, y, selected)) changed += 1;
    queue.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  return changed;
}

export function copyBitmapSelection(pattern, color, selection) {
  const x = Math.max(0, Math.min(255, Number(selection?.x) || 0));
  const y = Math.max(0, Math.min(191, Number(selection?.y) || 0));
  const width = Math.max(1, Math.min(256 - x, Number(selection?.width) || 1));
  const height = Math.max(1, Math.min(192 - y, Number(selection?.height) || 1));
  const pixels = new Uint8Array(width * height);
  for (let py = 0; py < height; py += 1) for (let px = 0; px < width; px += 1) {
    pixels[py * width + px] = bitmapPixel(pattern, color, x + px, y + py);
  }
  return { width, height, pixels };
}

export function pasteBitmapSelection(pattern, color, x, y, clipboard) {
  let changed = 0;
  for (let py = 0; py < clipboard.height; py += 1) for (let px = 0; px < clipboard.width; px += 1) {
    if (paintBitmapPixel(pattern, color, x + px, y + py, clipboard.pixels[py * clipboard.width + px])) changed += 1;
  }
  return changed;
}

function paletteRgb(palette, index) {
  const match = /^#([0-9a-f]{6})$/i.exec(String(palette?.[index] || ""));
  return match ? [0, 2, 4].map((offset) => parseInt(match[1].slice(offset, offset + 2), 16)) : [index * 17, index * 17, index * 17];
}

export function pasteBitmapSelectionSmart(pattern, color, x, y, clipboard, palette = []) {
  const left = Math.max(0, Math.floor(x));
  const top = Math.max(0, Math.floor(y));
  const right = Math.min(256, left + clipboard.width);
  const bottom = Math.min(192, top + clipboard.height);
  if (left >= right || top >= bottom) return 0;
  let changed = 0;
  for (let py = top; py < bottom; py += 1) {
    for (let blockX = Math.floor(left / 8) * 8; blockX < right; blockX += 8) {
      const desired = new Array(8);
      const weights = new Map();
      for (let bit = 0; bit < 8; bit += 1) {
        const px = blockX + bit;
        let value = bitmapPixel(pattern, color, px, py);
        const pasted = px >= left && px < right;
        if (pasted) value = clipboard.pixels[(py - top) * clipboard.width + (px - left)];
        desired[bit] = value;
        weights.set(value, (weights.get(value) || 0) + (pasted ? 256 : 1));
      }
      const pair = [...weights].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 2).map(([value]) => value);
      if (pair.length === 1) pair.push(pair[0]);
      const rgb = pair.map((value) => paletteRgb(palette, value));
      let nextPattern = 0;
      for (let bit = 0; bit < 8; bit += 1) {
        if (desired[bit] === pair[1]) { nextPattern |= 0x80 >> bit; continue; }
        if (desired[bit] === pair[0]) continue;
        const source = paletteRgb(palette, desired[bit]);
        const d0 = source.reduce((sum, channel, i) => sum + (channel - rgb[0][i]) ** 2, 0);
        const d1 = source.reduce((sum, channel, i) => sum + (channel - rgb[1][i]) ** 2, 0);
        if (d1 < d0) nextPattern |= 0x80 >> bit;
      }
      const address = bitmapAddress(blockX, py);
      const nextColor = ((pair[1] & 15) << 4) | (pair[0] & 15);
      if (pattern[address] !== nextPattern || color[address] !== nextColor) changed += 1;
      pattern[address] = nextPattern;
      color[address] = nextColor;
    }
  }
  return changed;
}

