import { alexisRuntimeCatalog } from "./alexisRuntimeCatalog.generated.js";

function collectUsedAlexisSymbols(asmBody, options = {}) {
  const used = new Set();
  const matches = asmBody.match(/\bAMY_[A-Z0-9_]+\b/g) || [];
  for (const symbol of matches) {
    if (alexisRuntimeCatalog[symbol]) used.add(symbol);
  }
  if (/\bsndtiny_[12]\b/.test(asmBody) || options.forceTinySound) used.add("AMY_TINY_SOUND");
  return used;
}

function resolveDependencies(initialSymbols) {
  const resolved = new Set();
  const visit = (symbol) => {
    if (resolved.has(symbol)) return;
    const entry = alexisRuntimeCatalog[symbol];
    if (!entry) return;
    resolved.add(symbol);
    for (const dep of entry.deps || []) visit(dep);
  };
  for (const symbol of initialSymbols) visit(symbol);
  return resolved;
}

const runtimeOrder = [
  "AMY_VDP_WRITE_REG",
  "AMY_SET_BITMAP_GRAPHICS_MODE",
  "AMY_SET_GRAPHICS_MODE1_TEXT",
  "AMY_SET_GRAPHICS_MODE1_BITMAP",
  "AMY_SET_GRAPHICS_MODE2_TEXT",
  "AMY_SET_GRAPHICS_MODE3_MULTICOLOR",
  "AMY_FILL_MODE2_TEXT_COLOR_FIRST_THIRD",
  "AMY_DUPLICATE_COLOR_THIRDS",
  "AMY_FILL_MODE2_TEXT_COLOR",
  "AMY_FILL_MODE2_TEXT_COLOR_FULL",
  "AMY_DUPLICATE_PATTERN_THIRDS",
  "AMY_LOAD_SEQUENTIAL_NAME_TABLE",
  "AMY_SET_DEFAULT_NAME_TABLE",
  "AMY_COPY_BYTES_TO_VRAM",
  "AMY_VPOKE",
  "AMY_VPEEK",
  "AMY_MERGE_BYTES_TO_VRAM",
  "AMY_MODE2_CALC_ADDRESS_MASK",
  "AMY_MODE2_PSET",
  "AMY_MODE2_PRESET",
  "AMY_MODE2_PSET_COLOR",
  "AMY_MODE2_GEOMETRY_SCRATCH",
  "AMY_MODE2_PLOT_CLIP",
  "AMY_MODE2_PLOT_COLOR_CLIP",
  "AMY_MODE2_PLOT_BCMAYBE_COLOR",
  "AMY_MODE2_LINE_PLOT_CURRENT",
  "AMY_MODE2_LINE_CORE",
  "AMY_MODE2_LINE",
  "AMY_MODE2_LINE_COLOR",
  "AMY_MODE2_CIRCLE_PLOT_POINTS",
  "AMY_MODE2_CIRCLE_CORE",
  "AMY_MODE2_CIRCLE",
  "AMY_MODE2_CIRCLE_COLOR",
  "AMY_MODE3_CALC_COLOR_ADDRESS",
  "AMY_MODE3_PSET",
  "AMY_MODE3_PSET_FAST",
  "AMY_MODE3_PGET",
  "AMY_MODE3_GEOMETRY_SCRATCH",
  "AMY_MODE3_HLINE",
  "AMY_MODE3_LINE",
  "AMY_MODE3_BOX",
  "AMY_REFLECT_PATTERN_VERTICAL",
  "AMY_REFLECT_PATTERN_HORIZONTAL",
  "AMY_ROTATE_PATTERN_90",
  "AMY_PUT_VRAM",
  "AMY_GET_VRAM",
  "AMY_RLE_TO_VRAM",
  "AMY_SHOW_PICTURE",
  "AMY_SET_SCREEN_PAGES",
  "AMY_SWAP_SCREEN_PAGES",
  "AMY_SCREEN_OFF_NO_NMI",
  "AMY_DISABLE_NMI",
  "AMY_SCREEN_ON_NMI",
  "AMY_SCREEN_ON_NO_NMI",
  "AMY_ENABLE_NMI",
  "AMY_SET_SPRITES8X8",
  "AMY_SET_SPRITES16X16",
  "AMY_SET_SPRITES_SIMPLE",
  "AMY_SET_SPRITES_DOUBLE",
  "AMY_SET_SPRITE_COUNT",
  "AMY_SET_SPRITE",
  "AMY_HIDE_SPRITE",
  "AMY_CLEAR_SPRITES",
  "AMY_UPDATE_SPRITES",
  "AMY_UPDATE_SPRITES_PARTIAL",
  "AMY_CHECK_COLLISION_RAW",
  "AMY_CHECK_SPRITE_COLLISION_BOX",
  "AMY_CHECK_SPRITE_COLLISION_RECT",
  "AMY_U16_TO_ASCII5",
  "AMY_I16_TO_ASCII6",
  "AMY_U8_TO_ASCII3",
  "AMY_U8_TO_ASCII2",
  "AMY_FX8_8_FRAC_TO_HUNDREDTHS",
  "AMY_FX8_8_TO_ASCII6",
  "AMY_SFX8_8_TO_ASCII7",
  "AMY_ENABLE_SPINNER",
  "AMY_DISABLE_SPINNER",
  "AMY_RESET_SPINNER1",
  "AMY_RESET_SPINNER2",
  "AMY_RESET_SPINNERS",
  "AMY_WAIT_FRAMES_SAFE",
  "AMY_TINY_SOUND",
  "AMY_SET_SOUND_TABLE",
  "AMY_PLAY_SOUND",
  "AMY_STOP_SOUND",
  "AMY_MUTE_ALL",
  "AMY_NEXT_SONG",
  "AMY_PLAY_SONG",
  "AMY_UPDATE_MUSIC",
  "AMY_STOP_SONG",
  "AMY_STOP_SONG_AREAS",
  "AMY_PLAY_DSOUND",
  "AMY_CLEAR_NAME_TABLE",
  "AMY_WIPE_SCREEN_UP",
  "AMY_WIPE_SCREEN_DOWN",
  "AMY_WIPE_BITMAP_UP",
  "AMY_WIPE_BITMAP_DOWN",
  "AMY_LOAD_DEFAULT_ASCII_STYLE",
  "AMY_LOAD_DEFAULT_ASCII",
  "AMY_PUT_CHAR_AT",
  "AMY_GET_CHAR_AT",
  "AMY_FILL_AT",
  "AMY_PRINT_AT",
  "AMY_PUT_AT",
  "AMY_PRINT_FP5_AT",
  "AMY_CHOICE_KEYPAD_RANGE",
  "AMY_TEXT_CALC_NAME_ADDRESS"
];

export function renderAlexisRuntime(asmBody, options = {}) {
  const excludedSourcePaths = new Set(
    [...(options.excludedSourcePaths || [])].map((path) => String(path).replace(/\\/g, "/"))
  );
  const used = resolveDependencies(collectUsedAlexisSymbols(asmBody, options));
  if (!used.size) return "";

  const lines = [];
  const prologueLines = [];
  for (const symbol of runtimeOrder) {
    if (!used.has(symbol)) continue;
    const entry = alexisRuntimeCatalog[symbol];
    if (excludedSourcePaths.has(String(entry.sourcePath || "").replace(/\\/g, "/"))) continue;
    for (const line of entry.prologue || []) {
      if (!prologueLines.includes(line)) prologueLines.push(line);
    }
  }

  lines.push("; --- Amy runtime routines (trimmed to used set) ---");
  if (prologueLines.length) {
    lines.push(...prologueLines, "");
  }

  const grouped = [];
  for (const symbol of runtimeOrder) {
    if (!used.has(symbol)) continue;
    const entry = alexisRuntimeCatalog[symbol];
    if (excludedSourcePaths.has(String(entry.sourcePath || "").replace(/\\/g, "/"))) continue;
    grouped.push(`; from ${entry.sourcePath}`);
    grouped.push(entry.asm, "");
  }
  lines.push(...grouped);
  return lines.join("\n").trimEnd();
}
