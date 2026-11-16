const VRAM_SIZE = 0x4000;
const SPRITE_COUNT = 32;
const SPRITE_BYTES = 4;

function requireByteArray(value, length, label) {
  if (!(value instanceof Uint8Array) || value.length < length) {
    throw new TypeError(`${label} must contain at least ${length} bytes.`);
  }
}

export function inspectTms9918SpriteTable(registers, vram) {
  requireByteArray(registers, 8, "VDP registers");
  requireByteArray(vram, VRAM_SIZE, "VDP VRAM");

  const base = (registers[5] & 0x7f) << 7;
  const entries = [];
  const warnings = [];
  let terminatorIndex = -1;

  for (let index = 0; index < SPRITE_COUNT; index += 1) {
    const offset = (base + index * SPRITE_BYTES) & 0x3fff;
    const entry = {
      index,
      y: vram[offset],
      x: vram[(offset + 1) & 0x3fff],
      pattern: vram[(offset + 2) & 0x3fff],
      color: vram[(offset + 3) & 0x3fff]
    };
    entries.push(entry);
    if (entry.y === 0xd0) {
      terminatorIndex = index;
      break;
    }
    if (entry.color & 0x70) {
      warnings.push({
        code: "sprite-reserved-color-bits",
        index,
        message: `Sprite ${index} uses reserved color bits $${(entry.color & 0x70).toString(16).padStart(2, "0")}.`
      });
    }
  }

  const tableHasData = entries.some(({ y, x, pattern, color }) => y || x || pattern || color);
  if (terminatorIndex < 0 && tableHasData) {
    warnings.push({
      code: "sprite-table-no-terminator",
      message: "The SAT has no $D0 terminator; this is legal only when all 32 sprites are intentionally active."
    });
  }

  return { base, terminatorIndex, activeCount: terminatorIndex < 0 ? 32 : terminatorIndex, entries, warnings };
}

export function validateTms9918Snapshot({ registers, vram }) {
  const diagnostics = [];
  requireByteArray(registers, 8, "VDP registers");
  requireByteArray(vram, VRAM_SIZE, "VDP VRAM");

  const modeBits = ((registers[0] >> 1) & 1) | ((registers[1] >> 2) & 6);
  if (![0, 1, 2, 4].includes(modeBits)) {
    diagnostics.push({
      severity: "warning",
      code: "undocumented-display-mode",
      message: `VDP mode-bit combination ${modeBits.toString(2).padStart(3, "0")} is undocumented.`
    });
  }

  const sprites = inspectTms9918SpriteTable(registers, vram);
  const displayEnabled = (registers[1] & 0x40) !== 0;
  const textMode = (registers[1] & 0x10) !== 0;
  if (displayEnabled && !textMode) {
    diagnostics.push(...sprites.warnings.map((warning) => ({ severity: "warning", ...warning })));
  }
  return { diagnostics, sprites };
}
