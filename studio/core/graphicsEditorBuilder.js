function positiveInteger(value, fallback, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(label + " must be a positive integer.");
  return parsed || fallback;
}

export function animationFrameNames({ names = [], prefix = "AnimationFrame", count = 1 } = {}) {
  const explicit = Array.from(names || []).map((name) => String(name || "").trim()).filter(Boolean);
  const total = positiveInteger(count, 1, "Frame count");
  if (explicit.length && explicit.length !== total) throw new Error("Frame table count must match frame count.");
  const base = String(prefix || "AnimationFrame").trim().replace(/[^A-Za-z0-9_]/g, "") || "AnimationFrame";
  return explicit.length ? explicit : Array.from({ length: total }, (_, index) => base + index);
}

export function buildAnimatedCharsetEditor(input = {}) {
  const name = String(input.name || "Animated Tiles").trim();
  const patternName = String(input.patternName || "").trim();
  if (!name) throw new Error("Editor name is required.");
  if (!patternName) throw new Error("Pattern table is required.");
  const tileCount = positiveInteger(input.tileCount, 1, "Tile count");
  const width = positiveInteger(input.frameWidth, 1, "Frame width");
  const height = positiveInteger(input.frameHeight, 1, "Frame height");
  const frameCount = positiveInteger(input.frameCount, 1, "Frame count");
  const baseTile = Number(input.baseTile);
  if (!Number.isInteger(baseTile) || baseTile < 0 || baseTile > 255) throw new Error("Base tile must be from 0 to 255.");
  if (baseTile + tileCount > 256) throw new Error("Tile range exceeds $FF.");
  const frameEntries = animationFrameNames({ names: input.frameNames, prefix: input.framePrefix, count: frameCount });
  const colorName = String(input.colorName || "").trim();
  return {
    name,
    kind: "charset",
    pattern: { from: "inline", name: patternName },
    ...(colorName ? { color: { from: "inline", name: colorName } } : {}),
    baseTile,
    sourceBaseTile: baseTile,
    tileCount,
    screenMode: "mode2",
    frameEntries,
    animation: {
      frameMs: positiveInteger(input.frameMs || 133, 133, "Frame duration"),
      frameSize: [width, height],
      frames: Array.from({ length: frameCount }, (_, index) => index)
    },
    notes: "Click a composed frame cell to edit its tile; Shift+click places the selected tile."
  };
}

export function initialAnimationFrameBytes({ baseTile = 0, tileCount = 1, width = 1, height = 1, frameIndex = 0 } = {}) {
  const length = positiveInteger(width, 1, "Frame width") * positiveInteger(height, 1, "Frame height");
  const count = positiveInteger(tileCount, 1, "Tile count");
  return Uint8Array.from({ length }, (_, index) => (Number(baseTile) + ((Number(frameIndex) * length + index) % count)) & 0xFF);
}
