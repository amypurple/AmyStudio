const TMS_PALETTE = [
  "#000000", "#000000", "#21C842", "#5EDC78", "#5455ED", "#7D76FC", "#D4524D", "#42EBF5",
  "#FC5554", "#FF7978", "#D4C154", "#E5CE80", "#21B03B", "#C95AA9", "#CCCCCC", "#FFFFFF"
];

const CODEC_EXTENSIONS = new Set(["zx0", "zx7", "dan1", "dan2", "dan3", "pletter", "lzf", "rle", "mdkrle", "bitbuster", "nibble"]);

function stripProjectPrefix(path) {
  return String(path || "").replace(/\\/g, "/").replace(/^@project\//i, "");
}

function splitPicturePath(path) {
  const bare = stripProjectPrefix(path);
  const parts = bare.split("/");
  const file = parts.pop() || "";
  const fileParts = file.split(".");
  const codec = fileParts.length > 1 && CODEC_EXTENSIONS.has(fileParts[fileParts.length - 1].toLowerCase())
    ? fileParts.pop().toLowerCase()
    : "";
  const component = fileParts.length > 1 ? fileParts[fileParts.length - 1].toLowerCase() : "";
  if (component === "pc") {
    fileParts.pop();
    return { group: [...parts, fileParts.join(".") || "picture"].join("/"), component: "pc", codec };
  }
  if (component === "pattern" || component === "pat" || component === "chr") {
    fileParts.pop();
    return { group: [...parts, fileParts.join(".") || "picture"].join("/"), component: "pattern", codec };
  }
  if (component === "color" || component === "col" || component === "clr") {
    fileParts.pop();
    return { group: [...parts, fileParts.join(".") || "picture"].join("/"), component: "color", codec };
  }
  if (component === "name" || component === "nam") {
    fileParts.pop();
    return { group: [...parts, fileParts.join(".") || "picture"].join("/"), component: "name", codec };
  }
  return { group: "", component: "", codec };
}

function splitSpritePath(path) {
  const bare = stripProjectPrefix(path);
  const parts = bare.split("/");
  const file = parts.pop() || "";
  const fileParts = file.split(".");
  const codec = fileParts.length > 1 && CODEC_EXTENSIONS.has(fileParts[fileParts.length - 1].toLowerCase())
    ? fileParts.pop().toLowerCase()
    : "";
  const component = fileParts.length > 1 ? fileParts[fileParts.length - 1].toLowerCase() : "";
  if (component === "sprpat" || component === "sprattr" || component === "sprcolor") {
    fileParts.pop();
    return { group: [...parts, fileParts.join(".") || "sprites"].join("/"), component, codec };
  }
  return { group: "", component: "", codec };
}

export function pictureComponentFromPath(path) {
  return splitPicturePath(path).component;
}

export function isPictureProjectFile(entry) {
  return !!pictureComponentFromPath(entry?.path);
}

function defaultNameTable() {
  const out = new Uint8Array(32 * 24);
  for (let i = 0; i < out.length; i += 1) out[i] = i & 0xFF;
  return out;
}

function defaultColorTable() {
  const out = new Uint8Array(6144);
  out.fill(0xF0);
  return out;
}

function defaultColorOnlyPatternTable(length = 6144) {
  const out = new Uint8Array(length);
  out.fill(0xF0);
  return out;
}

function expandTextModeColorTable32(color) {
  // TMS9918 Graphics I/text mode stores one color byte per 8-character group.
  const out = new Uint8Array(2048);
  for (let tile = 0; tile < 256; tile += 1) {
    out.fill(color[tile >> 3] ?? 0xF0, tile * 8, tile * 8 + 8);
  }
  return out;
}

async function decodeEntryBytes(entry, { projectFileBytes, decompressBytes, detectCodecFromName }) {
  const raw = projectFileBytes(entry);
  const codec = String(entry?.codec || detectCodecFromName?.(entry?.path || "") || "").toLowerCase();
  if (!codec || codec === "raw") return raw;
  if (!decompressBytes) throw new Error(`No decompressor available for ${entry.path}.`);
  return await decompressBytes(codec, raw);
}

async function loadSpriteTablesForGroup(group, allFiles, helpers) {
  const spriteFiles = (allFiles || []).filter((candidate) => {
    const parsed = splitSpritePath(candidate.path);
    return parsed.group && parsed.group.toLowerCase() === String(group || "").toLowerCase();
  });
  const byComponent = new Map();
  for (const file of spriteFiles) {
    const parsed = splitSpritePath(file.path);
    if (parsed.component && !byComponent.has(parsed.component)) byComponent.set(parsed.component, file);
  }
  const attrEntry = byComponent.get("sprattr");
  const patternEntry = byComponent.get("sprpat");
  const colorEntry = byComponent.get("sprcolor");
  return {
    attributes: attrEntry ? (await decodeEntryBytes(attrEntry, helpers)).slice(0, 128) : undefined,
    pattern: patternEntry ? (await decodeEntryBytes(patternEntry, helpers)).slice(0, 2048) : undefined,
    color: colorEntry ? (await decodeEntryBytes(colorEntry, helpers)).slice(0, 64) : undefined
  };
}

async function loadPictureTables(entry, allFiles, helpers) {
  const first = splitPicturePath(entry.path);
  if (!first.component) throw new Error(`Not a picture file: ${entry.path}`);
  const groupFiles = (allFiles || []).filter((candidate) => {
    const parsed = splitPicturePath(candidate.path);
    return parsed.group && parsed.group.toLowerCase() === first.group.toLowerCase();
  });
  const byComponent = new Map();
  for (const file of groupFiles) {
    const parsed = splitPicturePath(file.path);
    if (parsed.component && !byComponent.has(parsed.component)) byComponent.set(parsed.component, file);
  }

  if (byComponent.has("pc")) {
    const bytes = await decodeEntryBytes(byComponent.get("pc"), helpers);
    if (bytes.length < 12288) throw new Error(`${byComponent.get("pc").path} must decode to at least 12288 bytes for pattern+color preview.`);
    return {
      pattern: bytes.slice(0, 6144),
      color: bytes.slice(6144, 12288),
      name: defaultNameTable(),
      group: first.group,
      sprites: await loadSpriteTablesForGroup(first.group, allFiles, helpers)
    };
  }

  const patternEntry = byComponent.get("pattern");
  const colorEntry = byComponent.get("color");
  const nameEntry = byComponent.get("name");
  if (!patternEntry && !colorEntry) throw new Error(`Picture preview needs a .pattern/.pat/.chr, .color/.col/.clr, or .pc file for ${entry.path}.`);
  const rawColor = colorEntry ? await decodeEntryBytes(colorEntry, helpers) : defaultColorTable();
  const decodedPattern = patternEntry ? await decodeEntryBytes(patternEntry, helpers) : defaultColorOnlyPatternTable(rawColor.length >= 2048 && rawColor.length < 6144 ? 2048 : 6144);
  const name = nameEntry ? await decodeEntryBytes(nameEntry, helpers) : defaultNameTable();
  if (name.length < 768) throw new Error(`${nameEntry.path} must decode to at least 768 name-table bytes.`);
  const maxTile = name.slice(0, 768).reduce((max, value) => Math.max(max, value & 0xFF), 0);
  const requiredPatternBytes = (maxTile + 1) * 8;
  if (decodedPattern.length < requiredPatternBytes) {
    throw new Error(`${patternEntry.path} decodes to ${decodedPattern.length} pattern bytes, but the NAME table references tile $${maxTile.toString(16).toUpperCase().padStart(2, "0")} and needs ${requiredPatternBytes} bytes.`);
  }
  const pattern = decodedPattern.length < 2048 ? new Uint8Array(2048) : decodedPattern;
  if (decodedPattern.length < 2048) pattern.set(decodedPattern);
  const color = rawColor.length === 32 ? expandTextModeColorTable32(rawColor) : rawColor;
  if (color.length < 2048) throw new Error(`${colorEntry.path} must decode to at least 2048 color bytes, or exactly 32 text-mode color bytes.`);
  const isTileCharset = pattern.length < 6144 || color.length < 6144 || rawColor.length === 32 || decodedPattern.length < 2048;
  return {
    pattern: pattern.slice(0, isTileCharset ? 2048 : 6144),
    color: color.slice(0, isTileCharset ? 2048 : 6144),
    name: name.slice(0, 768),
    isTileCharset,
    colorMode: rawColor.length === 32 ? "text32" : "row",
    group: first.group,
    sprites: await loadSpriteTablesForGroup(first.group, allFiles, helpers)
  };
}

function renderTilePixel(ctx, { pattern, color }, patternIndex, x, y, scale, bank = 0) {
  for (let row = 0; row < 8; row += 1) {
    const tableOffset = pattern.length <= 2048 || color.length <= 2048
      ? patternIndex * 8 + row
      : bank * 2048 + patternIndex * 8 + row;
    const bits = pattern[tableOffset] || 0;
    const colorByte = color[tableOffset] || 0xF0;
    const fg = (colorByte >> 4) & 0x0F;
    const bg = colorByte & 0x0F;
    for (let col = 0; col < 8; col += 1) {
      const mask = 0x80 >> col;
      ctx.fillStyle = TMS_PALETTE[(bits & mask) ? fg : bg] || "#000000";
      ctx.fillRect((x + col) * scale, (y + row) * scale, scale, scale);
    }
  }
}

function renderSpritesToCanvas(ctx, sprites = {}, scale = 3) {
  const attr = sprites?.attributes;
  const pattern = sprites?.pattern;
  if (!attr || attr.length < 4 || !pattern || pattern.length < 8) return;
  const visiblePatterns = [];
  for (let offset = 0; offset + 3 < Math.min(attr.length, 128); offset += 4) {
    const yRaw = attr[offset] & 0xFF;
    if (yRaw === 0xD0) break;
    const colorIndex = attr[offset + 3] & 0x0F;
    if (colorIndex !== 0) visiblePatterns.push(attr[offset + 2] & 0xFF);
  }
  const spriteSize = visiblePatterns.length && visiblePatterns.every((patternIndex) => (patternIndex % 4) === 0) ? 16 : 8;
  for (let offset = 0; offset + 3 < Math.min(attr.length, 128); offset += 4) {
    const yRaw = attr[offset] & 0xFF;
    if (yRaw === 0xD0) break;
    const xRaw = attr[offset + 1] & 0xFF;
    const patternIndex = attr[offset + 2] & 0xFF;
    const colorByte = attr[offset + 3] & 0xFF;
    const colorIndex = colorByte & 0x0F;
    if (colorIndex === 0) continue;
    const x = xRaw - ((colorByte & 0x80) ? 32 : 0);
    const y = (yRaw + 1) & 0xFF;
    ctx.fillStyle = TMS_PALETTE[colorIndex] || "#FFFFFF";
    const blocks = spriteSize === 16
      ? [[0, 0, patternIndex], [8, 0, patternIndex + 1], [0, 8, patternIndex + 2], [8, 8, patternIndex + 3]]
      : [[0, 0, patternIndex]];
    for (const [dx, dy, blockPattern] of blocks) {
      for (let row = 0; row < 8; row += 1) {
        const bits = pattern[blockPattern * 8 + row] || 0;
        for (let col = 0; col < 8; col += 1) {
          if (bits & (0x80 >> col)) ctx.fillRect((x + dx + col) * scale, (y + dy + row) * scale, scale, scale);
        }
      }
    }
  }
}

function renderTablesToCanvas(canvas, { pattern, color, name }, scale = 3, options = {}) {
  canvas.width = 256 * scale;
  canvas.height = 192 * scale;
  canvas.style.imageRendering = "pixelated";
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const activeName = options.ignoreName ? defaultNameTable() : name;
  for (let tileY = 0; tileY < 24; tileY += 1) {
    const bank = Math.floor(tileY / 8);
    for (let tileX = 0; tileX < 32; tileX += 1) {
      const nameOffset = tileY * 32 + tileX;
      const patternIndex = activeName[nameOffset] & 0xFF;
      renderTilePixel(ctx, { pattern, color }, patternIndex, tileX * 8, tileY * 8, scale, bank);
    }
  }
  if (options.showSprites) renderSpritesToCanvas(ctx, options.sprites, scale);
}

function renderTilesetToCanvas(canvas, { pattern, color }, scale = 3) {
  canvas.width = 128 * scale;
  canvas.height = 128 * scale;
  canvas.style.imageRendering = "pixelated";
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let tile = 0; tile < 256; tile += 1) {
    renderTilePixel(ctx, { pattern, color }, tile, (tile % 16) * 8, Math.floor(tile / 16) * 8, scale, 0);
  }
}

export async function previewPictureProjectFile(entry, allFiles, helpers = {}) {
  const tables = await loadPictureTables(entry, allFiles, helpers);
  const scale = 3;
  let mode = "screen";
  let showSprites = !!(tables.sprites?.attributes && tables.sprites?.pattern);
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.88);z-index:1000";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", `Picture preview for ${entry.path}`);

  const frame = document.createElement("div");
  frame.style.cssText = "display:flex;flex-direction:column;gap:10px;align-items:center;color:#fff;font:14px sans-serif";
  const title = document.createElement("div");
  title.textContent = `Picture preview: ${stripProjectPrefix(entry.path)}`;
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;justify-content:center";
  const canvas = document.createElement("canvas");
  const info = document.createElement("div");
  info.style.cssText = "min-height:18px;opacity:.9";
  const render = () => {
    if (mode === "tileset") {
      renderTilesetToCanvas(canvas, tables, scale);
      info.textContent = "Tileset view: hover a tile to inspect its index.";
    } else {
      renderTablesToCanvas(canvas, tables, scale, {
        ignoreName: mode === "bitmapName",
        showSprites,
        sprites: tables.sprites
      });
      const colorNote = tables.colorMode === "text32" ? " Text-mode 32-byte color table expanded for preview." : "";
      info.textContent = (mode === "bitmapName"
        ? "Bitmap NAME view: default sequential NAME table."
        : "Screen view: imported NAME table.") + colorNote;
    }
  };
  const addButton = (label, nextMode) => {
    const control = document.createElement("button");
    control.type = "button";
    control.textContent = label;
    control.style.cssText = "padding:6px 10px;border:1px solid #fff;background:#111;color:#fff;cursor:pointer";
    control.addEventListener("click", (event) => {
      event.stopPropagation();
      mode = nextMode;
      render();
    });
    toolbar.appendChild(control);
  };
  addButton("Screen", "screen");
  addButton("Bitmap NAME", "bitmapName");
  addButton("Tileset", "tileset");
  if (tables.sprites?.attributes && tables.sprites?.pattern) {
    const spriteToggle = document.createElement("button");
    spriteToggle.type = "button";
    spriteToggle.textContent = "Sprites: on";
    spriteToggle.style.cssText = "padding:6px 10px;border:1px solid #fff;background:#153;color:#fff;cursor:pointer";
    spriteToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      showSprites = !showSprites;
      spriteToggle.textContent = `Sprites: ${showSprites ? "on" : "off"}`;
      render();
    });
    toolbar.appendChild(spriteToggle);
  }
  canvas.addEventListener("mousemove", (event) => {
    if (mode !== "tileset") return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / scale / 8);
    const y = Math.floor((event.clientY - rect.top) / scale / 8);
    if (x < 0 || x >= 16 || y < 0 || y >= 16) return;
    const tile = y * 16 + x;
    info.textContent = `Tile ${tile} / $${tile.toString(16).toUpperCase().padStart(2, "0")} · pattern offset $${(tile * 8).toString(16).toUpperCase().padStart(4, "0")}`;
  });
  render();
  const hint = document.createElement("div");
  hint.textContent = "Click anywhere to close.";
  hint.style.opacity = "0.75";
  frame.appendChild(title);
  frame.appendChild(toolbar);
  frame.appendChild(canvas);
  frame.appendChild(info);
  frame.appendChild(hint);
  overlay.appendChild(frame);
  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
}
