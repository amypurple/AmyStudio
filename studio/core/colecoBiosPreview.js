const TMS_PALETTE = [
  "#00000000", "#000000", "#21C842", "#5EDC78", "#5455ED", "#7D76FC", "#D4524D", "#42EBF5",
  "#FC5554", "#FF7978", "#D4C154", "#E5CE80", "#21B03B", "#C95AA9", "#CCCCCC", "#FFFFFF"
];

const CV_LOGO_2x24 = [
  0x60,0x61,0x68,0x69,0x70,0x71,0x78,0x79,0x80,0x81,0x88,0x89,0x64,0x65,0x6C,0x74,0x75,0x7C,0x84,0x85,0x8C,0x8D,0x1E,0x1F,
  0x62,0x63,0x6A,0x6B,0x72,0x73,0x7A,0x7B,0x82,0x83,0x8A,0x8B,0x66,0x67,0x6D,0x76,0x77,0x7D,0x86,0x87,0x8E,0x8F,0x00,0x00
];

const DINA_LOGO_4x12 = [
  0xA0,0xA0,0xA0,0xA0,0xA0,0xA0,0xA0,0xA0,0xA0,0xA0,0xA0,0xA0,
  0xA0,0x80,0x81,0x82,0x83,0x84,0x85,0x86,0x87,0x88,0x89,0xA0,
  0xA0,0x8A,0x8B,0x8C,0x8D,0x8E,0x8F,0x90,0x91,0x92,0x93,0xA0,
  0xA0,0xA0,0xA0,0xA0,0xA0,0xA0,0xA0,0xA0,0xA0,0xA0,0xA0,0xA0
];


const CV_PATTERN_DATA = `00 00 00 00 00 00 00 00 7e 81 bd a1 a1 bd 81 7e 1f 04 04 04 00 00 00 00 44 6c 54 54 00 00 00 00 00 00 00 00 00 00 00 00 20 20 20 20 20 00 20 00 50 50 50 00 00 00 00 00 50 50 f8 50 f8 50 50 00 20 78 a0 70 28 f0 20 00 c0 c8 10 20 40 98 18 00 40 a0 a0 40 a8 90 68 00 20 20 20 00 00 00 00 00 20 40 80 80 80 40 20 00 20 10 08 08 08 10 20 00 20 a8 70 20 70 a8 20 00 00 20 20 f8 20 20 00 00 00 00 00 00 20 20 40 00 00 00 00 f8 00 00 00 00 00 00 00 00 00 00 20 00 00 08 10 20 40 80 00 00 70 88 98 a8 c8 88 70 00 20 60 20 20 20 20 70 00 70 88 08 30 40 80 f8 00 f8 08 10 30 08 88 70 00 10 30 50 90 f8 10 10 00 f8 80 f0 08 08 88 70 00 38 40 80 f0 88 88 70 00 f8 08 10 20 40 40 40 00 70 88 88 70 88 88 70 00 70 88 88 78 08 10 e0 00 00 00 20 00 20 00 00 00 00 00 20 00 20 20 40 00 10 20 40 80 40 20 10 00 00 00 f8 00 f8 00 00 00 40 20 10 08 10 20 40 00 70 88 10 20 20 00 20 00 70 88 a8 b8 b0 80 78 00 20 50 88 88 f8 88 88 00 f0 88 88 f0 88 88 f0 00 70 88 80 80 80 88 70 00 f0 88 88 88 88 88 f0 00 f8 80 80 f0 80 80 f8 00 f8 80 80 f0 80 80 80 00 78 80 80 80 98 88 78 00 88 88 88 f8 88 88 88 00 70 20 20 20 20 20 70 00 08 08 08 08 08 88 70 00 88 90 a0 c0 a0 90 88 00 80 80 80 80 80 80 f8 00 88 d8 a8 a8 88 88 88 00 88 88 c8 a8 98 88 88 00 70 88 88 88 88 88 70 00 f0 88 88 f0 80 80 80 00 70 88 88 88 a8 90 68 00 f0 88 88 f0 a0 90 88 00 70 88 80 70 08 88 70 00 f8 20 20 20 20 20 20 00 88 88 88 88 88 88 70 00 88 88 88 88 88 50 20 00 88 88 88 a8 a8 d8 88 00 88 88 50 20 50 88 88 00 88 88 50 20 20 20 20 00 f8 08 10 20 40 80 f8 00 f8 c0 c0 c0 c0 c0 f8 00 00 80 40 20 10 08 00 00 f8 18 18 18 18 18 f8 00 00 00 20 50 88 00 00 00 00 00 00 00 00 00 00 f8 3f 7f ff ff f3 f3 f0 f0 00 80 c0 c0 c0 c0 00 00 f3 f3 ff ff 7f 3f 00 00 c0 c0 c0 c0 80 00 00 00 f1 f1 f1 7b 7b 7b 3f 3f e0 e0 e0 c0 c0 c0 80 80 3f 1f 1f 1f 0e 0e 00 00 80 00 00 00 00 00 00 00 3f 7f ff ff f3 f3 f3 f3 00 80 c0 c0 c0 c0 c0 c0 f3 f3 ff ff 7f 3f 00 00 c0 c0 c0 c0 80 00 00 00 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 f0 f0 f0 f0 f0 f0 f0 f0 00 00 00 00 00 00 00 00 f0 f0 ff ff ff ff 00 00 00 00 c0 c0 c0 c0 00 00 1f 3f 7f 79 78 7f 7f 3f 80 c0 e0 e0 00 80 c0 e0 1f 01 79 7f 3f 1f 00 00 e0 e0 e0 e0 c0 80 00 00 ff ff ff f0 f0 ff ff ff c0 c0 c0 00 00 00 00 00 f0 f0 ff ff ff ff 00 00 00 00 c0 c0 c0 c0 00 00 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 f0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3f 7f ff ff f3 f3 f0 f0 00 80 c0 c0 c0 c0 00 00 f3 f3 ff ff 7f 3f 00 00 c0 c0 c0 c0 80 00 00 00 3f 7f ff ff f3 f3 f3 f3 00 80 c0 c0 c0 c0 c0 c0 f3 f3 ff ff 7f 3f 00 00 c0 c0 c0 c0 80 00 00 00 3f 7f ff ff f3 f3 f3 f3 00 80 c0 c0 c0 c0 c0 c0 f3 f3 ff ff 7f 3f 00 00 c0 c0 c0 c0 80 00 00 00 f3 f3 fb fb fb ff ff ff c0 c0 c0 c0 c0 c0 c0 c0 ff f7 f7 f7 f3 f3 00 00 c0 c0 c0 c0 c0 c0 00 00`;
const CV_COLOR_DATA = `00 00 00 f0 f0 f0 f0 f0 f0 f0 f0 f0 d0 80 90 b0 30 40 00 00 00 00 00 00 00 00 00 00 00 00 00 00`;

const DINA_PATTERN_DATA = `00 00 00 00 00 00 00 00 7e 81 bd a1 a1 bd 81 7e 1f 04 04 04 00 00 00 00 44 6c 54 54 00 00 00 00 00 00 00 00 00 00 00 00 00 20 20 20 20 20 00 20 00 50 50 50 00 00 00 00 00 50 50 f8 50 f8 50 50 00 20 78 a0 70 28 f0 20 00 c0 c8 10 20 40 98 18 00 40 a0 a0 40 a8 90 68 00 10 10 10 20 00 00 00 00 20 40 80 80 80 40 20 00 20 10 08 08 08 10 20 00 20 a8 70 20 70 a8 20 00 00 20 20 f8 20 20 00 00 00 00 00 18 18 08 10 00 00 00 00 f8 00 00 00 00 00 00 00 00 00 60 60 00 00 08 10 20 40 80 00 00 70 88 98 a8 c8 88 70 00 20 60 20 20 20 20 70 00 70 88 08 30 40 80 f8 00 f8 08 10 30 08 88 70 00 10 30 50 90 f8 10 10 00 f8 80 f0 08 08 88 70 00 30 40 80 f0 88 88 70 00 f8 08 10 20 40 40 40 00 70 88 88 70 88 88 70 00 70 88 88 78 08 10 e0 00 00 30 30 00 30 30 00 00 18 18 00 18 18 08 10 00 10 20 40 80 40 20 10 00 00 00 f8 00 f8 00 00 00 80 40 20 10 20 40 80 00 70 88 10 20 20 00 20 00 70 88 88 b8 b8 80 78 00 20 50 88 88 f8 88 88 00 f0 88 88 f0 88 88 f0 00 70 88 80 80 80 88 70 00 f0 88 88 88 88 88 f0 00 f8 80 80 f0 80 80 f8 00 f8 80 80 f0 80 80 80 00 78 80 80 b8 88 88 78 00 88 88 88 f8 88 88 88 00 70 20 20 20 20 20 70 00 08 08 08 08 08 88 70 00 88 90 a0 c0 a0 90 88 00 80 80 80 80 80 80 f8 00 88 d8 a8 88 88 88 88 00 88 88 c8 a8 98 88 88 00 70 88 88 88 88 88 70 00 f0 88 88 f0 80 80 80 00 70 88 88 88 a8 90 68 00 f0 88 88 f0 a0 90 88 00 70 88 80 70 08 88 70 00 f8 20 20 20 20 20 20 00 88 88 88 88 88 88 70 00 88 88 88 88 88 50 20 00 88 88 88 a8 a8 d8 88 00 88 88 50 20 50 88 88 00 88 88 50 20 20 20 20 00 f8 08 10 20 40 80 f8 00 f8 80 80 80 80 80 f8 00 00 80 40 20 10 08 00 00 f8 08 08 08 08 08 f8 00 00 00 20 50 88 00 00 00 00 00 00 00 00 00 f8 00 60 60 40 20 00 00 00 00 00 00 68 98 88 98 68 00 80 80 b0 c8 88 c8 b0 00 00 00 78 80 80 80 78 00 08 08 68 98 88 98 68 00 00 00 70 88 f8 80 70 00 10 28 20 f8 20 20 20 00 68 98 98 68 08 08 70 00 80 80 b0 c8 88 88 88 00 20 00 60 20 20 20 70 00 10 00 10 10 10 10 60 00 00 80 90 a0 c0 a0 90 00 60 20 20 20 20 20 70 00 00 00 d0 a8 a8 a8 a8 00 00 00 f0 88 88 88 88 00 00 00 70 88 88 88 70 00 00 b0 c8 c8 b0 80 80 00 00 68 98 98 68 08 08 00 00 00 90 a0 c0 80 80 00 00 00 78 80 70 08 f0 00 20 20 70 20 20 20 30 00 00 00 88 88 88 88 78 00 00 00 88 88 88 50 20 00 00 00 88 88 a8 a8 50 00 00 00 88 50 20 50 88 00 00 00 90 90 f0 10 f0 00 00 00 f8 10 20 40 f8 00 20 40 40 80 40 40 20 00 20 20 20 00 20 20 20 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 1f 70 01 1f 18 30 3f 20 f8 0e 80 fc 0d 19 fb 33 0c cc cc d9 98 98 31 31 73 e3 07 cc c0 df 80 9f 0c 18 ff 30 60 ff 00 ff 00 00 8f 00 00 1f 03 06 18 30 ff 30 60 ff 00 03 00 00 f1 01 03 e3 03 87 00 00 ff 80 00 00 f8 fc 00 00 f0 00 00 00 7e ff 60 ff e0 7f 60 c0 ff 00 66 e6 0c ec 61 c1 8f 00 63 63 c3 c6 86 87 0d 00 30 30 60 7f 00 00 ff 00 06 06 0c fc 00 00 fc 00 1f 78 30 3f 60 60 ff 00 ff 00 00 ff 01 03 fe 00 e0 c0 c0 84 84 07 03 00 0f 07 07 07 0f fc f8 00 83 83 83 83 83 fe 7c 00`;
const DINA_COLOR_DATA = `00 00 00 f0 f0 f0 f0 f0 f0 f0 f0 f0 40 70 c0 a0 91 91 91 91 11 00 00 00 00 00 00 00 00 00 00 00`;

function hexToBytes(src) {
  const cleaned = String(src || "").replace(/[^0-9A-Fa-f]/g, " ").trim();
  if (!cleaned) return new Uint8Array();
  return new Uint8Array(cleaned.split(/\s+/).map((part) => parseInt(part, 16) & 0xFF));
}

function decodeTitleBytes(bytes) {
  const out = [];
  for (let index = 0; index < bytes.length; index += 1) {
    const value = bytes[index] & 0xFF;
    if (value === 0x1D) {
      out.push("{c}");
      continue;
    }
    if (value === 0x1E && (bytes[index + 1] & 0xFF) === 0x1F) {
      out.push("{tm}");
      index += 1;
      continue;
    }
    if (value >= 0x20 && value <= 0x7E) out.push(String.fromCharCode(value));
    else out.push(`{${value.toString(16).toUpperCase().padStart(2, "0")}}`);
  }
  return out.join("");
}

function parseCartridgeTitle(binary) {
  const titleOffset = 0x8024 - 0x8000;
  if (!binary || binary.length <= titleOffset) {
    return {
      line3Bytes: new Uint8Array(),
      line2Bytes: new Uint8Array(),
      yearBytes: Uint8Array.from([0x31, 0x39, 0x38, 0x32]),
      line3: "",
      line2: "",
      year: "1982",
      rawBytes: new Uint8Array()
    };
  }
  const raw = [];
  for (let index = titleOffset; index < binary.length; index += 1) {
    const value = binary[index] & 0xFF;
    if (value === 0x00) break;
    raw.push(value);
  }
  const parts = [];
  let current = [];
  for (const value of raw) {
    if (value === 0x2F) {
      parts.push(Uint8Array.from(current));
      current = [];
    } else {
      current.push(value);
    }
  }
  parts.push(Uint8Array.from(current));
  while (parts.length < 3) parts.push(new Uint8Array());
  const line3Bytes = parts[0];
  const line2Bytes = parts[1];
  const yearBytes = parts[2];
  return {
    line3Bytes,
    line2Bytes,
    yearBytes,
    line3: decodeTitleBytes(line3Bytes),
    line2: decodeTitleBytes(line2Bytes),
    year: decodeTitleBytes(yearBytes),
    rawBytes: Uint8Array.from(raw)
  };
}

export function inspectColecoBinary(binary) {
  if (!binary || binary.length < 2) {
    return { valid: false, usesDefaultScreen: false, header: 0, title: parseCartridgeTitle(binary || new Uint8Array()) };
  }
  const header = ((binary[1] & 0xFF) << 8) | (binary[0] & 0xFF);
  const usesDefaultScreen = header === 0x55AA;
  const valid = usesDefaultScreen || header === 0xAA55;
  return {
    valid,
    usesDefaultScreen,
    header,
    title: parseCartridgeTitle(binary)
  };
}

function createTmsOverlay(label, scale = 3) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#000;z-index:1000";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", label);
  const canvas = document.createElement("canvas");
  canvas.width = 256 * scale;
  canvas.height = 192 * scale;
  canvas.style.imageRendering = "pixelated";
  overlay.appendChild(canvas);
  document.body.appendChild(overlay);
  const close = () => {
    if (document.body.contains(overlay)) document.body.removeChild(overlay);
    document.removeEventListener("keydown", close);
    overlay.removeEventListener("click", close);
  };
  setTimeout(() => {
    document.addEventListener("keydown", close);
    overlay.addEventListener("click", close);
  }, 0);
  return { ctx: canvas.getContext("2d"), scale, close };
}

function blankName() {
  const bytes = new Uint8Array(32 * 24);
  bytes.fill(0x20);
  return bytes;
}

function pasteRect(name, row, col, w, h, flat) {
  for (let r = 0; r < h; r += 1) {
    for (let c = 0; c < w; c += 1) name[(row + r) * 32 + col + c] = flat[r * w + c] & 0xFF;
  }
}

function putBytesCentered(name, row, bytes) {
  const src = Uint8Array.from(bytes || []);
  const start = Math.max(0, Math.ceil((32 - src.length) / 2));
  for (let index = 0; index < src.length && start + index < 32; index += 1) {
    name[row * 32 + start + index] = src[index] & 0xFF;
  }
}

function putAsciiAt(name, row, col, text = "") {
  const textBytes = Uint8Array.from(String(text || "").toUpperCase().split("").map((ch) => ch.charCodeAt(0) & 0xFF));
  for (let index = 0; index < textBytes.length && col + index < 32; index += 1) {
    name[row * 32 + col + index] = textBytes[index];
  }
}

function colorsFor(tileIndex, colorBytes, defaultFg = 15, defaultBg = 1) {
  let fg = defaultFg;
  let bg = defaultBg;
  const index = tileIndex >>> 3;
  if (index < colorBytes.length) {
    const value = colorBytes[index] >>> 0;
    fg = (value >>> 4) & 0x0F;
    bg = value & 0x0F;
    if (fg === 0) fg = defaultBg;
    if (bg === 0) bg = defaultBg;
  }
  return [fg, bg];
}

function drawTile8(ctx, patterns, tileIndex, fg, bg, dx, dy, scale) {
  const baseTile = 0x00E0 >>> 3;
  const local = (tileIndex - baseTile) * 8;
  if (local < 0 || local + 7 >= patterns.length) {
    ctx.fillStyle = TMS_PALETTE[bg];
    ctx.fillRect(dx, dy, 8 * scale, 8 * scale);
    return;
  }
  for (let row = 0; row < 8; row += 1) {
    const value = patterns[local + row] >>> 0;
    for (let bit = 7; bit >= 0; bit -= 1) {
      ctx.fillStyle = ((value >> bit) & 1) ? TMS_PALETTE[fg] : TMS_PALETTE[bg];
      ctx.fillRect(dx + (7 - bit) * scale, dy + row * scale, scale, scale);
    }
  }
}

function drawScreen(ctx, scale, name, patterns, colors, defaultBg) {
  ctx.fillStyle = TMS_PALETTE[defaultBg];
  ctx.fillRect(0, 0, 256 * scale, 192 * scale);
  for (let row = 0; row < 24; row += 1) {
    for (let col = 0; col < 32; col += 1) {
      const tileIndex = name[row * 32 + col];
      const [fg, bg] = colorsFor(tileIndex, colors, 15, defaultBg);
      drawTile8(ctx, patterns, tileIndex, fg, bg, col * 8 * scale, row * 8 * scale, scale);
    }
  }
}

function buildColecoName(title) {
  const name = blankName();
  pasteRect(name, 4, 5, 24, 2, CV_LOGO_2x24);
  if (title.line2Bytes.length || title.line3Bytes.length) {
    putBytesCentered(name, 14, title.line2Bytes);
    putBytesCentered(name, 16, title.line3Bytes);
  } else {
    putAsciiAt(name, 13, 6, "TURN GAME OFF");
    putAsciiAt(name, 15, 2, "BEFORE INSERTING CARTRIDGE");
    putAsciiAt(name, 17, 4, "OR EXPANSION MODULE.");
  }
  const base = 21 * 32 + 10;
  name[base + 0] = 0x1D;
  name[base + 1] = 0x20;
  for (let index = 0; index < title.yearBytes.length && index < 4; index += 1) name[base + 2 + index] = title.yearBytes[index];
  putAsciiAt(name, 21, 16, " COLECO");
  return name;
}

function buildDinaName(title) {
  const name = blankName();
  pasteRect(name, 3, 9, 12, 4, DINA_LOGO_4x12);
  putAsciiAt(name, 9, 6, "BIT CORPORATION 1986");
  putBytesCentered(name, 14, title.line2Bytes);
  putBytesCentered(name, 16, title.line3Bytes);
  return name;
}

function normalizeTitleMetadata(meta) {
  if (!meta || !Array.isArray(meta.bytes)) return null;
  const rawBytes = Uint8Array.from(meta.bytes.map((value) => value & 0xFF));
  const parts = [];
  let current = [];
  for (const value of rawBytes) {
    if (value === 0x2F) {
      parts.push(Uint8Array.from(current));
      current = [];
    } else {
      current.push(value);
    }
  }
  parts.push(Uint8Array.from(current));
  while (parts.length < 3) parts.push(new Uint8Array());
  return {
    line3Bytes: parts[0],
    line2Bytes: parts[1],
    yearBytes: parts[2],
    line3: decodeTitleBytes(parts[0]),
    line2: decodeTitleBytes(parts[1]),
    year: decodeTitleBytes(parts[2]),
    rawBytes
  };
}

function previewBootFromTitleInfo(title, kind) {
  if (!title) return false;
  const isDina = kind === "dina";
  const overlay = createTmsOverlay(isDina ? "DINA BIOS preview" : "Coleco BIOS preview", 3);
  const patterns = hexToBytes(isDina ? DINA_PATTERN_DATA : CV_PATTERN_DATA);
  const colors = hexToBytes(isDina ? DINA_COLOR_DATA : CV_COLOR_DATA);
  const name = isDina ? buildDinaName(title) : buildColecoName(title);
  drawScreen(overlay.ctx, overlay.scale, name, patterns, colors, isDina ? 2 : 1);
  setTimeout(overlay.close, isDina ? 4000 : 8000);
  return true;
}

function previewBoot(binary, kind) {
  const info = inspectColecoBinary(binary);
  if (!info.valid || !info.usesDefaultScreen) return false;
  return previewBootFromTitleInfo(info.title, kind);
}

export function previewColecoBiosTitleScreen(binary) {
  return previewBoot(binary, "coleco");
}

export function previewDinaBiosTitleScreen(binary) {
  return previewBoot(binary, "dina");
}

export function previewColecoBiosTitleFromMetadata(meta) {
  return previewBootFromTitleInfo(normalizeTitleMetadata(meta), "coleco");
}

export function previewDinaBiosTitleFromMetadata(meta) {
  return previewBootFromTitleInfo(normalizeTitleMetadata(meta), "dina");
}
