export function normalizeTilemapSelection(anchor, focus, mapWidth, mapHeight) {
  const maxX = Math.max(0, Number(mapWidth) - 1);
  const maxY = Math.max(0, Number(mapHeight) - 1);
  const clamp = (value, max) => Math.max(0, Math.min(max, Number(value) || 0));
  const ax = clamp(anchor?.col, maxX);
  const ay = clamp(anchor?.row, maxY);
  const bx = clamp(focus?.col, maxX);
  const by = clamp(focus?.row, maxY);
  const x = Math.min(ax, bx);
  const y = Math.min(ay, by);
  return { x, y, width: Math.abs(ax - bx) + 1, height: Math.abs(ay - by) + 1 };
}

export function copyTilemapSelection(bytes, mapWidth, selection) {
  const copied = new Uint8Array(selection.width * selection.height);
  for (let row = 0; row < selection.height; row += 1) {
    const sourceOffset = (selection.y + row) * mapWidth + selection.x;
    copied.set(bytes.slice(sourceOffset, sourceOffset + selection.width), row * selection.width);
  }
  return { width: selection.width, height: selection.height, bytes: copied };
}

export function fillTilemapSelection(bytes, mapWidth, selection, value) {
  for (let row = 0; row < selection.height; row += 1) {
    const offset = (selection.y + row) * mapWidth + selection.x;
    bytes.fill(Number(value) & 0xff, offset, offset + selection.width);
  }
}

export function pasteTilemapSelection(bytes, mapWidth, mapHeight, x, y, clipboard) {
  const pasteWidth = Math.max(0, Math.min(clipboard.width, mapWidth - x));
  const pasteHeight = Math.max(0, Math.min(clipboard.height, mapHeight - y));
  for (let row = 0; row < pasteHeight; row += 1) {
    const sourceOffset = row * clipboard.width;
    const targetOffset = (y + row) * mapWidth + x;
    bytes.set(clipboard.bytes.slice(sourceOffset, sourceOffset + pasteWidth), targetOffset);
  }
  return { x, y, width: pasteWidth, height: pasteHeight };
}
