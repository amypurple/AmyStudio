const TMS_PALETTE = [
  { r: 0x00, g: 0x00, b: 0x00 },
  { r: 0x00, g: 0x00, b: 0x00 },
  { r: 0x21, g: 0xC8, b: 0x42 },
  { r: 0x5E, g: 0xDC, b: 0x78 },
  { r: 0x54, g: 0x55, b: 0xED },
  { r: 0x7D, g: 0x76, b: 0xFC },
  { r: 0xD4, g: 0x52, b: 0x4D },
  { r: 0x42, g: 0xEB, b: 0xF5 },
  { r: 0xFC, g: 0x55, b: 0x54 },
  { r: 0xFF, g: 0x79, b: 0x78 },
  { r: 0xD4, g: 0xC1, b: 0x54 },
  { r: 0xE5, g: 0xCE, b: 0x80 },
  { r: 0x21, g: 0xB0, b: 0x3B },
  { r: 0xC9, g: 0x5A, b: 0xA9 },
  { r: 0xCC, g: 0xCC, b: 0xCC },
  { r: 0xFF, g: 0xFF, b: 0xFF }
];

const OUTPUT_WIDTH = 256;
const OUTPUT_HEIGHT = 192;
const CODEC_FILE_EXTENSIONS = {
  raw: "",
  zx0: "zx0",
  zx7: "zx7",
  dan1: "dan1",
  dan2: "dan2",
  dan3: "dan3",
  mdkrle: "rle",
  rle: "rle",
  nibble: "nibble",
  pletter: "pletter",
  lzf: "lzf",
  bitbuster: "bitbuster"
};

function sanitizePictureStem(name) {
  const stem = String(name || "picture")
    .replace(/\.[^.\\/]+$/, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return stem || "picture";
}

export function normalizePictureImportCodec(codec = "raw") {
  const normalized = String(codec || "raw").trim().toLowerCase();
  if (!normalized || normalized === "none" || normalized === "uncompressed") return "raw";
  if (normalized === "rle") return "mdkrle";
  if (Object.prototype.hasOwnProperty.call(CODEC_FILE_EXTENSIONS, normalized)) return normalized;
  throw new Error(`Unsupported picture import codec: ${codec}`);
}

function pictureCodecExtension(codec) {
  const normalized = normalizePictureImportCodec(codec);
  return CODEC_FILE_EXTENSIONS[normalized] || "";
}

function nearestPaletteIndex(r, g, b, { allowTransparent = false } = {}) {
  let best = allowTransparent ? 0 : 1;
  let bestDistance = Infinity;
  const start = allowTransparent ? 0 : 1;
  for (let index = start; index < TMS_PALETTE.length; index += 1) {
    const color = TMS_PALETTE[index];
    const dr = r - color.r;
    const dg = g - color.g;
    const db = b - color.b;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function colorDistanceSquared(left, right) {
  const dr = left.r - right.r;
  const dg = left.g - right.g;
  const db = left.b - right.b;
  return dr * dr + dg * dg + db * db;
}

function colorBlendRatio(left, right, pixel) {
  const pairDistance = colorDistanceSquared(left, right);
  if (!pairDistance) return 0;
  return (pairDistance + colorDistanceSquared(left, pixel) - colorDistanceSquared(right, pixel)) / pairDistance / 2;
}

const BAYER_MATRICES = {
  "ordered-2x2": [
    [0, 2],
    [3, 1]
  ],
  "ordered-4x4": [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ],
  "ordered-8x8": [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
  ]
};

function orderedDitherOffset(x, y, amount) {
  if (!amount) return 0;
  const bayer4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ];
  return ((bayer4[y & 3][x & 3] / 15) - 0.5) * amount * 2.55;
}

export function adjustRgbaForPictureImport(rgba, options = {}) {
  const brightness = Math.max(-100, Math.min(100, Number(options.brightness || 0)));
  const saturation = Math.max(-100, Math.min(100, Number(options.saturation || 0)));
  const contrast = Math.max(-100, Math.min(100, Number(options.contrast || 0)));
  const gamma = Math.max(10, Math.min(400, Number(options.gamma || 100)));
  if (!brightness && !saturation && !contrast && gamma === 100) return rgba;

  const out = new Uint8ClampedArray(rgba);
  const brightnessOffset = brightness * 2.55;
  const saturationFactor = 1 + saturation / 100;
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const gammaPower = 100 / gamma;
  const gammaTable = new Uint8Array(256);
  for (let value = 0; value < 256; value += 1) {
    gammaTable[value] = clampByte(Math.pow(value / 255, gammaPower) * 255);
  }
  for (let offset = 0; offset < out.length; offset += 4) {
    let r = gammaTable[out[offset]] + brightnessOffset;
    let g = gammaTable[out[offset + 1]] + brightnessOffset;
    let b = gammaTable[out[offset + 2]] + brightnessOffset;
    if (contrast) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }
    if (saturation) {
      const grey = r * 0.299 + g * 0.587 + b * 0.114;
      r = grey + (r - grey) * saturationFactor;
      g = grey + (g - grey) * saturationFactor;
      b = grey + (b - grey) * saturationFactor;
    }
    out[offset] = clampByte(r);
    out[offset + 1] = clampByte(g);
    out[offset + 2] = clampByte(b);
  }
  return out;
}

function activePicturePalette(options = {}) {
  const includeColor0 = !!options.allowTransparentPalette || !!options.transparentAsColor0;
  const active = Array.isArray(options.activePaletteIndexes) && options.activePaletteIndexes.length >= 2
    ? options.activePaletteIndexes
    : Array.from({ length: includeColor0 ? 16 : 15 }, (_, i) => includeColor0 ? i : i + 1);
  const unique = [];
  for (const raw of active) {
    const index = Math.max(0, Math.min(15, Number(raw) | 0));
    if (!includeColor0 && index === 0) continue;
    if (!unique.includes(index)) unique.push(index);
  }
  if (unique.length < 2) {
    for (let index = includeColor0 ? 0 : 1; index < 16; index += 1) {
      if (!unique.includes(index)) unique.push(index);
      if (unique.length >= 2) break;
    }
  }
  return unique.map(index => ({ ...TMS_PALETTE[index], index }));
}

function rowPixelsFromRgba(rgba, y, tileX) {
  const pixels = [];
  for (let bit = 0; bit < 8; bit += 1) {
    const pixelOffset = (y * OUTPUT_WIDTH + tileX * 8 + bit) * 4;
    pixels.push({
      r: rgba[pixelOffset],
      g: rgba[pixelOffset + 1],
      b: rgba[pixelOffset + 2],
      a: rgba[pixelOffset + 3],
      x: tileX * 8 + bit,
      y
    });
  }
  return pixels;
}

function chooseBestPalettePair(pixels, palette) {
  let bestScore = Infinity;
  let first = palette[0];
  let second = palette[1] || palette[0];
  for (let left = 0; left < palette.length - 1; left += 1) {
    for (let right = left + 1; right < palette.length; right += 1) {
      const leftColor = palette[left];
      const rightColor = palette[right];
      let score = 0;
      for (const pixel of pixels) {
        score += Math.min(colorDistanceSquared(leftColor, pixel), colorDistanceSquared(rightColor, pixel));
      }
      if (score < bestScore) {
        bestScore = score;
        first = leftColor;
        second = rightColor;
      }
    }
  }
  let firstCount = 0;
  let secondCount = 0;
  for (const pixel of pixels) {
    if (colorDistanceSquared(first, pixel) <= colorDistanceSquared(second, pixel)) firstCount += 1;
    else secondCount += 1;
  }
  if (secondCount > firstCount) return [second, first];
  return [first, second];
}

function orderedPairChoice(first, second, pixel, method, amount) {
  if (method === "none") {
    return colorDistanceSquared(first, pixel) <= colorDistanceSquared(second, pixel) ? first : second;
  }
  const matrix = BAYER_MATRICES[method] || BAYER_MATRICES["ordered-4x4"];
  const size = matrix.length;
  const maxValue = size * size;
  const threshold = (Math.max(0, Math.min(100, amount)) / 100) * (matrix[pixel.y % size][pixel.x % size] / maxValue);
  const distFirst = colorDistanceSquared(first, pixel);
  const distSecond = colorDistanceSquared(second, pixel);
  const ratio = distFirst / (distFirst + distSecond + 0.0001);
  return ratio > 0.5 + threshold ? second : first;
}

function cvPaintRow8x1ToTables(rgba, options = {}) {
  const pattern = new Uint8Array(6144);
  const color = new Uint8Array(6144);
  const palette = activePicturePalette(options);
  const method = String(options.ditherMode || "error-diffusion").toLowerCase();
  const errorFactor = Math.max(0, Math.min(100, Number(options.errorDiffusion || options.ditherAmount || 75))) / 100;
  const thresholdAmount = Math.max(0, Math.min(100, Number(options.ditherAmount || 35)));
  const errR = new Float32Array(OUTPUT_WIDTH * OUTPUT_HEIGHT);
  const errG = new Float32Array(OUTPUT_WIDTH * OUTPUT_HEIGHT);
  const errB = new Float32Array(OUTPUT_WIDTH * OUTPUT_HEIGHT);
  const kernel = [
    { dx: 1, dy: 0, weight: 7 / 16 },
    { dx: -1, dy: 1, weight: 3 / 16 },
    { dx: 0, dy: 1, weight: 5 / 16 },
    { dx: 1, dy: 1, weight: 1 / 16 }
  ];

  const getPixel = (x, y) => {
    const index = y * OUTPUT_WIDTH + x;
    const offset = index * 4;
    return {
      r: Math.max(0, Math.min(255, rgba[offset] + errR[index])),
      g: Math.max(0, Math.min(255, rgba[offset + 1] + errG[index])),
      b: Math.max(0, Math.min(255, rgba[offset + 2] + errB[index])),
      a: rgba[offset + 3],
      x,
      y
    };
  };

  for (let y = 0; y < OUTPUT_HEIGHT; y += 1) {
    for (let tileX = 0; tileX < 32; tileX += 1) {
      const pixels = method === "error-diffusion"
        ? Array.from({ length: 8 }, (_, bit) => getPixel(tileX * 8 + bit, y))
        : rowPixelsFromRgba(rgba, y, tileX);
      const [first, second] = chooseBestPalettePair(pixels, palette);
      let patternByte = 0;

      for (let bit = 0; bit < 8; bit += 1) {
        const x = tileX * 8 + bit;
        const pixel = method === "error-diffusion" ? getPixel(x, y) : pixels[bit];
        const chosen = method === "error-diffusion"
          ? (colorBlendRatio(first, second, pixel) > 0.5 ? second : first)
          : orderedPairChoice(first, second, pixel, method, thresholdAmount);
        if (chosen.index === first.index) patternByte |= 0x80 >> bit;

        if (method === "error-diffusion") {
          const er = (pixel.r - chosen.r) * errorFactor;
          const eg = (pixel.g - chosen.g) * errorFactor;
          const eb = (pixel.b - chosen.b) * errorFactor;
          for (const item of kernel) {
            const nx = x + item.dx;
            const ny = y + item.dy;
            if (nx >= 0 && nx < OUTPUT_WIDTH && ny >= 0 && ny < OUTPUT_HEIGHT) {
              const next = ny * OUTPUT_WIDTH + nx;
              errR[next] += er * item.weight;
              errG[next] += eg * item.weight;
              errB[next] += eb * item.weight;
            }
          }
        }
      }

      const tableOffset = Math.floor(y / 8) * 256 + tileX * 8 + (y & 7);
      pattern[tableOffset] = patternByte;
      color[tableOffset] = ((first.index & 0x0F) << 4) | (second.index & 0x0F);
    }
  }

  return { pattern, color };
}

export function defaultPictureNameTable() {
  const name = new Uint8Array(32 * 24);
  for (let i = 0; i < name.length; i += 1) name[i] = i & 0xFF;
  return name;
}

export function rgbaToColecoBitmapTables(rgba, width = OUTPUT_WIDTH, height = OUTPUT_HEIGHT, options = {}) {
  if (!rgba || typeof rgba.length !== "number") throw new Error("RGBA pixel data is required.");
  if (width !== OUTPUT_WIDTH || height !== OUTPUT_HEIGHT) {
    throw new Error(`Expected ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT} RGBA pixels; got ${width}x${height}.`);
  }
  if (rgba.length < width * height * 4) throw new Error("RGBA pixel data is shorter than width*height*4.");

  const colorMode = String(options.colorMode || "row8x1").toLowerCase();
  const ditherMode = String(options.ditherMode || "error-diffusion").toLowerCase();
  if (colorMode === "row8x1") {
    return {
      ...cvPaintRow8x1ToTables(rgba, options),
      name: defaultPictureNameTable(),
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT
    };
  }

  const pattern = new Uint8Array(6144);
  const color = new Uint8Array(6144);
  const rowIndexes = new Uint8Array(8);
  const ditherAmount = Math.max(0, Math.min(100, Number(options.ditherAmount || 0)));

  for (let y = 0; y < OUTPUT_HEIGHT; y += 1) {
    for (let tileX = 0; tileX < 32; tileX += 1) {
      const counts = new Uint8Array(16);
      for (let bit = 0; bit < 8; bit += 1) {
        const pixelOffset = (y * OUTPUT_WIDTH + tileX * 8 + bit) * 4;
        const alpha = rgba[pixelOffset + 3];
        const dither = ditherMode === "ordered" || ditherMode === "ordered-4x4" ? orderedDitherOffset(tileX * 8 + bit, y, ditherAmount) : 0;
        const paletteIndex = alpha === 0 && options.transparentAsColor0
          ? 0
          : nearestPaletteIndex(
              clampByte(rgba[pixelOffset] + dither),
              clampByte(rgba[pixelOffset + 1] + dither),
              clampByte(rgba[pixelOffset + 2] + dither),
              {
              allowTransparent: !!options.allowTransparentPalette
              }
            );
        rowIndexes[bit] = paletteIndex;
        counts[paletteIndex] += 1;
      }

      let fg = 15;
      let bg = 1;
      for (let index = 0; index < 16; index += 1) {
        if (counts[index] > counts[fg]) fg = index;
      }
      let bgCount = -1;
      for (let index = 0; index < 16; index += 1) {
        if (index !== fg && counts[index] > bgCount) {
          bg = index;
          bgCount = counts[index];
        }
      }
      if (bgCount <= 0) bg = fg;

      let patternByte = 0;
      for (let bit = 0; bit < 8; bit += 1) {
        if (rowIndexes[bit] === fg) patternByte |= 0x80 >> bit;
      }

      const tableOffset = Math.floor(y / 8) * 256 + tileX * 8 + (y & 7);
      pattern[tableOffset] = patternByte;
      color[tableOffset] = ((fg & 0x0F) << 4) | (bg & 0x0F);
    }
  }

  return {
    pattern,
    color,
    name: defaultPictureNameTable(),
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT
  };
}

export function colecoBitmapTablesToImageData(tables) {
  const rgba = new Uint8ClampedArray(OUTPUT_WIDTH * OUTPUT_HEIGHT * 4);
  const pattern = tables?.pattern || new Uint8Array(6144);
  const color = tables?.color || new Uint8Array(6144);
  const name = tables?.name || defaultPictureNameTable();
  for (let tileY = 0; tileY < 24; tileY += 1) {
    const bank = Math.floor(tileY / 8);
    for (let tileX = 0; tileX < 32; tileX += 1) {
      const patternIndex = name[tileY * 32 + tileX] & 0xFF;
      for (let row = 0; row < 8; row += 1) {
        const tableOffset = bank * 2048 + patternIndex * 8 + row;
        const bits = pattern[tableOffset] || 0;
        const colorByte = color[tableOffset] || 0xF0;
        const fg = (colorByte >> 4) & 0x0F;
        const bg = colorByte & 0x0F;
        for (let col = 0; col < 8; col += 1) {
          const palette = TMS_PALETTE[(bits & (0x80 >> col)) ? fg : bg] || TMS_PALETTE[1];
          const out = ((tileY * 8 + row) * OUTPUT_WIDTH + tileX * 8 + col) * 4;
          rgba[out] = palette.r;
          rgba[out + 1] = palette.g;
          rgba[out + 2] = palette.b;
          rgba[out + 3] = 255;
        }
      }
    }
  }
  return { data: rgba, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
}

export function renderImageToColecoCanvas(image, options = {}) {
  if (typeof document === "undefined") throw new Error("Image conversion requires a browser document.");
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create a 2D canvas context.");

  const resize = options.resize || "fit";
  ctx.fillStyle = options.background || "#000";
  ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  ctx.imageSmoothingEnabled = options.imageSmoothing !== false;

  const srcWidth = image.naturalWidth || image.videoWidth || image.width;
  const srcHeight = image.naturalHeight || image.videoHeight || image.height;
  if (!srcWidth || !srcHeight) throw new Error("Image has no readable dimensions.");

  if (resize === "stretch") {
    ctx.drawImage(image, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  } else {
    const scale = resize === "cover"
      ? Math.max(OUTPUT_WIDTH / srcWidth, OUTPUT_HEIGHT / srcHeight)
      : Math.min(OUTPUT_WIDTH / srcWidth, OUTPUT_HEIGHT / srcHeight);
    const drawWidth = Math.round(srcWidth * scale);
    const drawHeight = Math.round(srcHeight * scale);
    const dx = Math.floor((OUTPUT_WIDTH - drawWidth) / 2);
    const dy = Math.floor((OUTPUT_HEIGHT - drawHeight) / 2);
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
  }

  const imageData = ctx.getImageData(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  if (options.brightness || options.saturation || options.contrast || options.gamma) {
    imageData.data.set(adjustRgbaForPictureImport(imageData.data, options));
  }
  return imageData;
}

export async function imageFileToColecoBitmapTables(file, options = {}) {
  if (typeof Image === "undefined" || typeof URL === "undefined") {
    throw new Error("Image file conversion requires browser Image and URL APIs.");
  }
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not decode image ${file?.name || ""}`.trim()));
      img.src = imageUrl;
    });
    const imageData = renderImageToColecoCanvas(image, options);
    return rgbaToColecoBitmapTables(imageData.data, imageData.width, imageData.height, options);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export async function buildPictureProjectFileEntries(name, tables, options = {}) {
  const stem = sanitizePictureStem(name);
  const codec = normalizePictureImportCodec(options.codec || "raw");
  const extension = pictureCodecExtension(codec);
  const compressBytes = options.compressBytes;
  const components = [
    { component: "pattern", bytes: tables.pattern },
    { component: "color", bytes: tables.color }
  ];
  if (options.includeNameTable) components.push({ component: "name", bytes: tables.name || defaultPictureNameTable() });

  const entries = [];
  for (const item of components) {
    let bytes = item.bytes;
    let path = `${stem}.${item.component}`;
    let entryCodec = "raw";
    if (codec && codec !== "raw") {
      if (typeof compressBytes !== "function") throw new Error(`Compression requested for ${codec}, but no compressor is available.`);
      bytes = await compressBytes(codec, item.bytes);
      path = `${path}.${extension}`;
      entryCodec = codec;
    }
    entries.push({
      path,
      bytes: new Uint8Array(bytes),
      kind: "picture",
      source: options.source || "imageToPicture",
      codec: entryCodec
    });
  }
  return entries;
}

export function pcBytesToColecoBitmapTables(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (data.length < 12288) throw new Error(`.pc picture data must be at least 12288 bytes; got ${data.length}.`);
  return {
    pattern: data.slice(0, 6144),
    color: data.slice(6144, 12288),
    name: defaultPictureNameTable(),
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT
  };
}

export function patternBytesToColecoBitmapTables(bytes, options = {}) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (data.length < 6144) throw new Error(`Pattern picture data must be at least 6144 bytes; got ${data.length}.`);
  return {
    pattern: data.slice(0, 6144),
    color: options.color ? new Uint8Array(options.color).slice(0, 6144) : new Uint8Array(6144).fill(0xF0),
    name: defaultPictureNameTable(),
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT
  };
}

export function colorBytesToColecoBitmapTables(bytes, options = {}) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (data.length < 6144) throw new Error(`Color picture data must be at least 6144 bytes; got ${data.length}.`);
  return {
    pattern: options.pattern ? new Uint8Array(options.pattern).slice(0, 6144) : new Uint8Array(6144),
    color: data.slice(0, 6144),
    name: defaultPictureNameTable(),
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT
  };
}

function visibleSpriteAttributes(data) {
  const attr = data instanceof Uint8Array ? data : new Uint8Array(data || []);
  if (attr.length < 128) return undefined;
  for (let offset = 0; offset < 128; offset += 4) {
    const y = attr[offset] & 0xFF;
    if (y === 0xD0) break;
    if (y !== 0 || attr[offset + 1] !== 0 || attr[offset + 2] !== 0 || attr[offset + 3] !== 0) {
      return attr.slice(0, 128);
    }
  }
  return undefined;
}

export function grpBytesToColecoBitmapTables(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (data.length < 0x2007 + 6144) throw new Error(`.grp picture data must be at least ${0x2007 + 6144} bytes; got ${data.length}.`);
  return {
    pattern: data.slice(7, 7 + 6144),
    color: data.slice(0x2007, 0x2007 + 6144),
    name: data.length >= 0x1807 + 768 ? data.slice(0x1807, 0x1807 + 768) : defaultPictureNameTable(),
    spriteAttributes: data.length >= 0x1B07 + 128 ? visibleSpriteAttributes(data.slice(0x1B07, 0x1B07 + 128)) : undefined,
    spritePattern: data.length >= 0x3807 + 2048 ? data.slice(0x3807, 0x3807 + 2048) : undefined,
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT,
    sourceFormat: "grp"
  };
}

export function sc2BytesToColecoBitmapTables(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const hasBloadHeader = data[0] === 0xFE && data.length >= 0x3807;
  const base = hasBloadHeader ? 7 : 0;
  if (data.length < base + 0x2000 + 6144) throw new Error(`.sc2 picture data is too short for pattern/name/color tables; got ${data.length}.`);
  return {
    pattern: data.slice(base, base + 6144),
    color: data.slice(base + 0x2000, base + 0x2000 + 6144),
    name: data.slice(base + 0x1800, base + 0x1800 + 768),
    spriteAttributes: data.length >= base + 0x1B00 + 128 ? visibleSpriteAttributes(data.slice(base + 0x1B00, base + 0x1B00 + 128)) : undefined,
    spritePattern: data.length >= base + 0x3800 + 2048 ? data.slice(base + 0x3800, base + 0x3800 + 2048) : undefined,
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT,
    sourceFormat: hasBloadHeader ? "sc2" : "raw-sc2"
  };
}

function parseIcvGmDatSections(text) {
  const sections = { NAME: [], PATTERN: [], MCOLOR: [], COLOR: [], SPATT: [], SCOLOR: [], SATTR: [] };
  let current = "";
  const hexRe = /\$([0-9A-Fa-f]{2})/g;
  for (const line of String(text || "").split(/\r?\n/)) {
    if (/^[A-Za-z_]/.test(line)) {
      const up = line.toUpperCase();
      if (up.startsWith("MCOLOR")) current = "MCOLOR";
      else if (up.startsWith("NAME")) current = "NAME";
      else if (up.startsWith("PATTERN")) current = "PATTERN";
      else if (up.startsWith("SPATT")) current = "SPATT";
      else if (up.startsWith("SCOLOR")) current = "SCOLOR";
      else if (up.startsWith("SATTR")) current = "SATTR";
      else if (up.startsWith("COLOR")) current = "COLOR";
      else current = "";
    }
    if (!current) continue;
    let match;
    hexRe.lastIndex = 0;
    while ((match = hexRe.exec(line)) !== null) sections[current].push(parseInt(match[1], 16));
  }
  return sections;
}

export function isIcvGmDatText(text) {
  const sections = parseIcvGmDatSections(text);
  return sections.NAME.length >= 768
    && sections.PATTERN.length >= 2048
    && (sections.MCOLOR.length >= 2048 || sections.COLOR.length >= 32);
}

export function icvgmDatTextToColecoTileTables(text) {
  const sections = parseIcvGmDatSections(text);
  if (sections.NAME.length < 768) throw new Error("ICVGM .dat NAME section is missing or incomplete.");
  if (sections.PATTERN.length < 2048) throw new Error("ICVGM .dat PATTERN section is missing or incomplete.");

  let colorRows;
  const sourceFormat = sections.MCOLOR.length >= 2048 ? "icvgm-v3-tiles" : "icvgm-v2-tiles";
  if (sections.MCOLOR.length >= 2048) {
    colorRows = sections.MCOLOR.slice(0, 2048);
  } else if (sections.COLOR.length >= 32) {
    colorRows = new Array(2048);
    for (let tile = 0; tile < 256; tile += 1) {
      const color = sections.COLOR[Math.floor(tile / 8)] || 0xF1;
      for (let row = 0; row < 8; row += 1) colorRows[tile * 8 + row] = color;
    }
  } else {
    throw new Error("ICVGM .dat COLOR or MCOLOR section is missing or incomplete.");
  }

  return {
    pattern: Uint8Array.from(sections.PATTERN.slice(0, 2048), byte => byte & 0xFF),
    color: Uint8Array.from(colorRows, byte => byte & 0xFF),
    name: Uint8Array.from(sections.NAME.slice(0, 768), byte => byte & 0xFF),
    spritePattern: sections.SPATT.length >= 2048 ? Uint8Array.from(sections.SPATT.slice(0, 2048), byte => byte & 0xFF) : undefined,
    spriteColor: sections.SCOLOR.length >= 64 ? Uint8Array.from(sections.SCOLOR.slice(0, 64), byte => byte & 0xFF) : undefined,
    spriteAttributes: sections.SATTR.length >= 128 ? Uint8Array.from(sections.SATTR.slice(0, 128), byte => byte & 0xFF) : undefined,
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT,
    sourceFormat
  };
}

export function icvgmDatTextToColecoBitmapTables(text) {
  const sections = parseIcvGmDatSections(text);

  if (sections.NAME.length < 768) throw new Error("ICVGM .dat NAME section is missing or incomplete.");
  if (sections.PATTERN.length < 2048) throw new Error("ICVGM .dat PATTERN section is missing or incomplete.");

  let colorRows;
  if (sections.MCOLOR.length >= 2048) {
    colorRows = sections.MCOLOR;
  } else if (sections.COLOR.length >= 32) {
    colorRows = new Array(2048);
    for (let tile = 0; tile < 256; tile += 1) {
      const color = sections.COLOR[Math.floor(tile / 8)] || 0xF1;
      for (let row = 0; row < 8; row += 1) colorRows[tile * 8 + row] = color;
    }
  } else {
    throw new Error("ICVGM .dat COLOR or MCOLOR section is missing or incomplete.");
  }

  const pattern = new Uint8Array(6144);
  const color = new Uint8Array(6144);
  const name = Uint8Array.from(sections.NAME.slice(0, 768), byte => byte & 0xFF);
  const tiles = sections.PATTERN;
  for (let charY = 0; charY < 24; charY += 1) {
    for (let charX = 0; charX < 32; charX += 1) {
      const tile = name[charY * 32 + charX] || 0;
      const src = tile * 8;
      const dst = charY * 256 + charX * 8;
      for (let row = 0; row < 8; row += 1) {
        pattern[dst + row] = tiles[src + row] || 0;
        color[dst + row] = colorRows[src + row] || 0xF1;
      }
    }
  }

  return {
    pattern,
    color,
    name,
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT,
    includeNameTable: true,
    sourceFormat: sections.MCOLOR.length >= 2048 ? "icvgm-v3" : "icvgm-v2"
  };
}

export function powerPaintBytesToColecoBitmapTables(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (data.length !== 10240 && data.length !== 40960) {
    throw new Error(`PowerPaint .pp picture data must be 10240 or 40960 bytes; got ${data.length}.`);
  }
  const pattern = new Uint8Array(6144);
  const color = new Uint8Array(6144);
  color.fill(0xF0);

  const importCell = (patternBlock, colorBlock, startTileX, startTileY, widthTiles, heightTiles) => {
    for (let row = 0; row < heightTiles; row += 1) {
      let dst = (startTileY + row) * 256 + startTileX * 8;
      let src = row * 256 + 16;
      for (let column = 0; column < widthTiles * 8; column += 1) {
        pattern[dst] = patternBlock[src] || 0;
        color[dst] = colorBlock[src] || 0;
        dst += 1;
        src += 1;
      }
    }
  };

  if (data.length === 10240) {
    importCell(data.subarray(0, 5120), data.subarray(5120, 10240), 0, 0, 30, 20);
  } else {
    let offset = 0;
    const readCell = () => {
      const colorBlock = data.subarray(offset, offset + 5120);
      const patternBlock = data.subarray(offset + 5120, offset + 10240);
      offset += 10240;
      return { patternBlock, colorBlock };
    };
    let cell = readCell();
    importCell(cell.patternBlock, cell.colorBlock, 0, 0, 30, 20);
    cell = readCell();
    importCell(cell.patternBlock, cell.colorBlock, 30, 0, 2, 20);
    cell = readCell();
    importCell(cell.patternBlock, cell.colorBlock, 0, 20, 30, 4);
    cell = readCell();
    importCell(cell.patternBlock, cell.colorBlock, 30, 20, 2, 4);
  }

  return {
    pattern,
    color,
    name: defaultPictureNameTable(),
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT
  };
}

export async function pcFileToPictureProjectFileEntries(file, options = {}) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const tables = pcBytesToColecoBitmapTables(bytes);
  return buildPictureProjectFileEntries(file?.name || "picture.pc", tables, {
    ...options,
    source: "pcToPicture"
  });
}

export async function powerPaintFileToPictureProjectFileEntries(file, options = {}) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const tables = powerPaintBytesToColecoBitmapTables(bytes);
  return buildPictureProjectFileEntries(file?.name || "picture.pp", tables, {
    ...options,
    source: "powerPaintToPicture"
  });
}

export async function imageFileToPictureProjectFileEntries(file, options = {}) {
  const tables = await imageFileToColecoBitmapTables(file, options);
  return buildPictureProjectFileEntries(file?.name || "picture", tables, options);
}
