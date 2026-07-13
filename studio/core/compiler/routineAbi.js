// Routine ABI metadata used by the Amy compiler and optimizer-facing helpers.
// Keep this conservative: an overstated clobber costs bytes, an understated one
// can corrupt generated programs.

function abi(entry) {
  return Object.freeze({
    kind: entry.kind || "runtime",
    inputs: Object.freeze(entry.inputs || {}),
    outputs: Object.freeze(entry.outputs || {}),
    clobbers: Object.freeze(entry.clobbers || []),
    preserves: Object.freeze(entry.preserves || []),
    notes: entry.notes || ""
  });
}

export const ROUTINE_ABI = Object.freeze({
  // Coleco BIOS / OS-7 entry points used by Amy runtime wrappers.
  CALC_OFFSET: abi({
    kind: "bios",
    inputs: { d: "row", e: "column" },
    outputs: { de: "row * 32 + column" },
    clobbers: ["af", "de"],
    notes: "BIOS text offset helper. HL is treated as preserved by Amy callers."
  }),
  FILL_VRAM: abi({
    kind: "bios",
    inputs: { hl: "VRAM destination", de: "byte count", a: "fill byte" },
    clobbers: ["af", "bc", "de", "hl"],
    notes: "BIOS VRAM fill primitive."
  }),
  WRITE_VRAM: abi({
    kind: "bios",
    inputs: { hl: "RAM source", de: "VRAM destination", bc: "byte count" },
    clobbers: ["af", "bc", "de", "hl"],
    notes: "BIOS raw _WrtVRAM entry. Counts with C != 0 need Amy wrapper fix unless count is proven byte-sized."
  }),
  READ_VRAM: abi({
    kind: "bios",
    inputs: { de: "VRAM source", hl: "RAM destination", bc: "byte count" },
    clobbers: ["af", "bc", "de", "hl"],
    notes: "BIOS raw _ReadVRAM entry. Counts with C != 0 need Amy wrapper fix unless count is proven byte-sized."
  }),
  WRITE_REGISTER: abi({
    kind: "bios",
    inputs: { b: "VDP register", c: "value" },
    clobbers: ["af", "bc"],
    notes: "Updates BIOS VDP shadows for register writes."
  }),
  READ_REGISTER: abi({
    kind: "bios",
    inputs: { a: "VDP register" },
    outputs: { a: "register value" },
    clobbers: ["af"],
    notes: "BIOS VDP register read helper."
  }),
  INIT_TABLE: abi({
    kind: "bios",
    inputs: { a: "table id", hl: "VRAM base" },
    clobbers: ["af", "bc", "de", "hl"],
    notes: "BIOS VDP table initializer/shadow updater."
  }),
  LOAD_ASCII: abi({
    kind: "bios",
    clobbers: ["af", "bc", "de", "hl"],
    notes: "Uploads Coleco BIOS ASCII font."
  }),
  TURN_OFF_SOUND: abi({
    kind: "bios",
    clobbers: ["af", "bc"],
    notes: "Silences PSG through BIOS routine."
  }),
  SET_SOUND_TABLE: abi({
    kind: "bios",
    inputs: { hl: "sound table", b: "sound area count" },
    clobbers: ["af", "bc", "de", "hl", "ix", "iy"],
    notes: "BIOS sound table setup. IX/IY are conservative because sound BIOS internals use indexed state."
  }),
  PLAY_SOUND_SLOT: abi({
    kind: "bios",
    inputs: { b: "sound index" },
    clobbers: ["af", "bc", "de", "hl", "ix", "iy"],
    notes: "BIOS sound trigger. Amy wrapper preserves IX/IY around this call."
  }),
  PLAY_SOUNDS: abi({
    kind: "bios",
    clobbers: ["af", "bc", "de", "hl", "ix", "iy"],
    notes: "BIOS per-frame sound update."
  }),
  GET_RANDOM: abi({
    kind: "bios",
    outputs: { hl: "updated/random seed component" },
    clobbers: ["af", "bc", "de", "hl"],
    notes: "Amy mixes returned L with R for legacy random expressions."
  }),
  UPDATE_CONTROLLERS: abi({ kind: "bios", clobbers: ["af", "bc", "de", "hl"] }),
  UPDATE_SPINNER: abi({ kind: "bios", clobbers: ["af", "bc", "de", "hl"] }),
  PUT_FRAME: abi({
    kind: "bios",
    inputs: { hl: "RAM frame buffer", b: "height", c: "width", d: "row", e: "column" },
    clobbers: ["af", "bc", "de", "hl", "iy"],
    notes: "BIOS frame writer at $080B. A08C0 proves D=row and E=column; B is row count/height and C is width. PUT_FRAME loads IY during clipping."
  }),
  GET_BKGRND: abi({
    kind: "bios",
    inputs: { hl: "RAM frame buffer", b: "height", c: "width", d: "row", e: "column" },
    clobbers: ["af", "bc", "de", "hl", "ix", "iy"],
    notes: "BIOS frame reader at $0898. A08C0 proves D=row and E=column; B is row count/height and C is width. Calls _BlkReadVRAM and uses IY."
  }),

  // General runtime wrappers.
  AMY_RANDOM_U8: abi({ outputs: { a: "random byte" }, clobbers: ["af", "de", "hl"], notes: "Amy xorshift16 byte random helper using legacy_random_seed with zero fallback." }),

  // VDP/text runtime wrappers.
  AMY_VRAM_BEGIN: abi({ clobbers: ["af", "bc", "hl"], notes: "Disables NMI for a VRAM critical section and saves original R1 shadow on the stack for AMY_VRAM_END." }),
  AMY_VRAM_END: abi({ clobbers: ["af", "bc", "hl"], notes: "Restores the R1 shadow saved by AMY_VRAM_BEGIN and acknowledges VDP status when NMI was originally enabled." }),
  AMY_COPY_BYTES_TO_VRAM: abi({ inputs: { hl: "RAM source", de: "VRAM destination", bc: "byte count" }, clobbers: ["af", "bc", "de", "hl"], notes: "WRITE_VRAM count-fix wrapper." }),
  AMY_GET_VRAM: abi({ inputs: { de: "VRAM source", hl: "RAM destination", bc: "byte count" }, clobbers: ["af", "bc", "de", "hl"], notes: "READ_VRAM count-fix wrapper." }),
  AMY_VPOKE: abi({ inputs: { hl: "VRAM address", a: "value" }, clobbers: ["af", "hl"] }),
  AMY_VPEEK: abi({ inputs: { hl: "VRAM address" }, outputs: { a: "value" }, clobbers: ["af", "hl"] }),
  AMY_PUT_AT: abi({ inputs: { hl: "RAM source", d: "row", e: "column", b: "byte count" }, clobbers: ["af", "bc", "de", "hl"], notes: "Copies exactly B bytes; C is not an input." }),
  AMY_PUT_CHAR_AT: abi({ inputs: { d: "row", e: "column", a: "tile" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_GET_CHAR_AT: abi({ inputs: { d: "row", e: "column" }, outputs: { a: "tile" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FILL_AT: abi({ inputs: { d: "row", e: "column", a: "tile", b: "count" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_TEXT_CALC_NAME_ADDRESS: abi({ inputs: { d: "row", e: "column" }, outputs: { hl: "name table VRAM address" }, clobbers: ["af", "de", "hl"] }),
  AMY_CLEAR_NAME_TABLE: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_LOAD_DEFAULT_ASCII: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_LOAD_DEFAULT_ASCII_STYLE: abi({ inputs: { a: "style flags" }, clobbers: ["af", "bc", "de", "hl"] }),

  // VDP modes and screen state.
  AMY_SET_BITMAP_GRAPHICS_MODE: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_SET_GRAPHICS_MODE1_BITMAP: abi({ inputs: { a: "default color byte" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_SET_GRAPHICS_MODE1_TEXT: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_SET_GRAPHICS_MODE2_TEXT: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_SET_GRAPHICS_MODE3_MULTICOLOR: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FILL_MODE2_TEXT_COLOR: abi({ inputs: { a: "color byte" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FILL_MODE2_TEXT_COLOR_FULL: abi({ inputs: { a: "color byte" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_DUPLICATE_PATTERN_THIRDS: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_DUPLICATE_COLOR_THIRDS: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_SCREEN_OFF_NO_NMI: abi({ clobbers: ["af", "bc"] }),
  AMY_SCREEN_ON_NO_NMI: abi({ clobbers: ["af", "bc"] }),
  AMY_SCREEN_ON_NMI: abi({ clobbers: ["af", "bc"] }),
  AMY_DISABLE_NMI: abi({ clobbers: ["af", "bc"] }),
  AMY_ENABLE_NMI: abi({ clobbers: ["af", "bc"] }),

  // Mode 1/3 drawing helpers.
  AMY_MODE2_PSET: abi({ inputs: { b: "x", c: "y" }, clobbers: ["af", "bc", "hl"] }),
  AMY_MODE2_PRESET: abi({ inputs: { b: "x", c: "y" }, clobbers: ["af", "bc", "hl"] }),
  AMY_MODE2_PSET_COLOR: abi({ inputs: { b: "x", c: "y", a: "color" }, clobbers: ["af", "bc", "hl"] }),
  AMY_MODE2_LINE: abi({ inputs: { b: "x1", c: "y1", d: "x2", e: "y2" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_MODE2_LINE_COLOR: abi({ inputs: { b: "x1", c: "y1", d: "x2", e: "y2", a: "color" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_MODE2_CIRCLE: abi({ inputs: { b: "center x", c: "center y", d: "radius" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_MODE2_CIRCLE_COLOR: abi({ inputs: { a: "color", b: "center x", c: "center y", d: "radius" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_MODE3_PSET: abi({ inputs: { b: "x", c: "y", a: "color" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_MODE3_PGET: abi({ inputs: { b: "x", c: "y" }, outputs: { a: "color" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_MODE3_LINE: abi({ inputs: { b: "x1", c: "y1", d: "x2", e: "y2", a: "color" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_MODE3_BOX: abi({ inputs: { b: "x1", c: "y1", d: "x2", e: "y2", a: "color" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_WIPE_SCREEN_UP: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_WIPE_SCREEN_DOWN: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_WIPE_BITMAP_UP: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_WIPE_BITMAP_DOWN: abi({ clobbers: ["af", "bc", "de", "hl"] }),

  // Sprites and collisions.
  AMY_SET_SPRITE: abi({ inputs: { a: "sprite index", b: "y", c: "x", d: "pattern", e: "color" }, clobbers: ["af", "de", "hl"] }),
  AMY_HIDE_SPRITE: abi({ inputs: { a: "sprite index" }, clobbers: ["af", "de", "hl"] }),
  AMY_CLEAR_SPRITES: abi({ clobbers: ["af", "bc", "hl"] }),
  AMY_UPDATE_SPRITES: abi({ clobbers: ["af", "de", "hl"] }),
  AMY_UPDATE_SPRITES_PARTIAL: abi({ inputs: { a: "count" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_SET_SPRITE_COUNT: abi({ inputs: { a: "count" }, clobbers: ["af", "hl"] }),
  AMY_CHECK_COLLISION_RAW: abi({ outputs: { hl: "0 or 1" }, clobbers: ["af", "bc", "de", "hl", "ix"] }),
  AMY_CHECK_SPRITE_COLLISION_BOX: abi({ inputs: { a: "sprite1 index", b: "sprite2 index", c: "box width", d: "box height" }, outputs: { a: "boolean" }, clobbers: ["af", "bc", "de", "hl", "ix", "iy"] }),
  AMY_CHECK_SPRITE_COLLISION_RECT: abi({ inputs: { a: "sprite1 index", b: "sprite2 index", c: "x offset", d: "y offset", e: "box width", l: "box height" }, outputs: { a: "boolean" }, clobbers: ["af", "bc", "de", "hl", "ix", "iy"] }),

  // Math integer/fixed helpers.
  AMY_U16_DIV: abi({ inputs: { hl: "dividend", bc: "divisor" }, outputs: { hl: "quotient", memory: "AMY_U16_DIV_REM = remainder" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_I16_DIV: abi({ inputs: { hl: "dividend", bc: "divisor" }, outputs: { hl: "quotient" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_I16_MOD: abi({ inputs: { hl: "dividend", bc: "divisor" }, outputs: { hl: "remainder" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_U16_SQRT: abi({ inputs: { hl: "value" }, outputs: { hl: "floor sqrt" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_U32_ZERO: abi({ inputs: { hl: "u32 pointer" }, clobbers: ["af", "hl"] }),
  AMY_U32_COPY: abi({ inputs: { hl: "source pointer", de: "destination pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_U32_INC: abi({ inputs: { hl: "u32 pointer" }, clobbers: ["af", "hl"] }),
  AMY_U32_ADD: abi({ inputs: { hl: "left/destination pointer", de: "right pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_U32_SUB: abi({ inputs: { hl: "left/destination pointer", de: "right pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_U32_MUL: abi({ inputs: { hl: "left/destination pointer", de: "right pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_U32_DIV: abi({ inputs: { hl: "left/destination pointer", de: "right pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_CMP_U32_MEM: abi({ inputs: { hl: "left pointer", de: "right pointer" }, outputs: { flags: "compare result" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_CMP_S32_MEM: abi({ inputs: { hl: "left pointer", de: "right pointer" }, outputs: { flags: "compare result" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FX8_8_MUL: abi({ inputs: { hl: "left", bc: "right" }, outputs: { hl: "result" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FX8_8_DIV: abi({ inputs: { hl: "left", bc: "right" }, outputs: { hl: "result" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FX16_16_MULT: abi({ inputs: { hl: "left pointer", de: "right pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FX16_16_DIV: abi({ inputs: { hl: "left pointer", de: "right pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FX16_16_SQRT: abi({ inputs: { hl: "source pointer", de: "destination pointer" }, clobbers: ["af", "bc", "de", "hl"] }),

  // Formatting helpers.
  AMY_U8_TO_ASCII3: abi({ inputs: { a: "value", de: "destination buffer" }, clobbers: ["af", "bc", "de"] }),
  AMY_U8_TO_ASCII2: abi({ inputs: { a: "value", de: "destination buffer" }, clobbers: ["af", "bc", "de"] }),
  AMY_U16_TO_ASCII5: abi({ inputs: { hl: "value", de: "destination buffer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_I16_TO_ASCII6: abi({ inputs: { hl: "value", de: "destination buffer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_U32_TO_ASCII10: abi({ inputs: { hl: "source pointer", de: "destination buffer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_I32_TO_ASCII11: abi({ inputs: { hl: "source pointer", de: "destination buffer" }, clobbers: ["af", "bc", "de", "hl"] }),

  // Sound, timers, input.
  AMY_SET_SOUND_TABLE: abi({ inputs: { hl: "sound table", a: "area count shadow input via AMY_SOUND_AREA_COUNT" }, clobbers: ["af", "bc", "de", "hl", "ix", "iy"] }),
  AMY_PLAY_SOUND: abi({ inputs: { b: "sound index" }, clobbers: ["af", "bc", "de", "hl"], notes: "Wrapper preserves IX/IY around PLAY_SOUND_SLOT." }),
  AMY_STOP_SOUND: abi({ inputs: { b: "sound index" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_STOP_SONG: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_MUTE_ALL: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_UPDATE_MUSIC: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_PLAY_SONG: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_PLAY_DSOUND: abi({ inputs: { hl: "dsound data", c: "step" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_WAIT_FRAMES_SAFE: abi({ inputs: { hl: "frame count" }, clobbers: ["af", "de"] }),
  AMY_CHOICE_KEYPAD_RANGE: abi({ outputs: { a: "choice" }, clobbers: ["af", "bc", "de", "hl"] }),


  // BIOS compatibility / generated startup helpers.
  MODE_1: abi({ kind: "bios", clobbers: ["af", "bc", "de", "hl"], notes: "Legacy BIOS mode setup entry used by bootstrap compatibility code." }),
  AMY_INIT_RAM: abi({ clobbers: ["af", "bc", "de", "hl"], notes: "Generated per-program RAM initializer." }),
  AMY_NUMERIC_POSTPROCESS: abi({ inputs: { hl: "ASCII buffer", b: "character count" }, clobbers: ["af", "bc", "de", "hl"] }),

  // VDP table/page and pattern transform helpers.
  AMY_SET_DEFAULT_NAME_TABLE: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_LOAD_SEQUENTIAL_NAME_TABLE: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_SET_SCREEN_PAGES: abi({ inputs: { a: "page config" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_SWAP_SCREEN_PAGES: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_MERGE_BYTES_TO_VRAM: abi({ inputs: { hl: "source bytes", bc: "byte count", d: "AND mask", e: "XOR value" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_ROTATE_PATTERN_90: abi({ clobbers: ["af", "bc", "de", "hl"] }),

  // Sprite mode R1 helpers.
  AMY_SET_SPRITES8X8: abi({ clobbers: ["af", "bc"] }),
  AMY_SET_SPRITES16X16: abi({ clobbers: ["af", "bc"] }),
  AMY_SET_SPRITES_SIMPLE: abi({ clobbers: ["af", "bc"] }),
  AMY_SET_SPRITES_DOUBLE: abi({ clobbers: ["af", "bc"] }),

  // Spinner helpers.
  AMY_ENABLE_SPINNER: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_DISABLE_SPINNER: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_RESET_SPINNERS: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_RESET_SPINNER1: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_RESET_SPINNER2: abi({ clobbers: ["af", "bc", "de", "hl"] }),

  // FP5 helpers. Conservative clobbers because the fp5 runtime uses shared FPA state.
  AMY_FP5_I16_TO_FPA1: abi({ inputs: { hl: "i16 value" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_U16_TO_FPA1: abi({ inputs: { hl: "u16 value" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_RND: abi({ outputs: { memory: "FPA1 fraction result" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_LOAD_MEM_TO_FPA1: abi({ inputs: { hl: "fp5 source pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_LOAD_MEM_TO_FPA2: abi({ inputs: { hl: "fp5 source pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_STORE_FPA1_TO_MEM: abi({ inputs: { hl: "fp5 destination pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_STORE_FPA2_TO_MEM: abi({ inputs: { hl: "fp5 destination pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_COPY_FPA1_TO_FPA2: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_COPY_FPA2_TO_FPA1: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_CMP_FPA1_FPA2: abi({ outputs: { flags: "compare result" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_MUL_FPA1_FPA2: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_DIV_FPA1_FPA2: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_TO_FX16_16: abi({ inputs: { hl: "fp5 source pointer", de: "fixed32 destination pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_ABS_MEM: abi({ inputs: { hl: "fp5 in/out pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_EXP_MEM: abi({ inputs: { hl: "fp5 in/out pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_LOG_MEM: abi({ inputs: { hl: "fp5 in/out pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_SQRT_MEM: abi({ inputs: { hl: "fp5 in/out pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_TO_ASCII16: abi({ inputs: { hl: "fp5 source pointer", de: "ASCII destination buffer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FP5_TO_FRIENDLY_ASCII16: abi({ inputs: { hl: "fp5 source pointer", de: "ASCII destination buffer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_PRINT_FP5_AT: abi({ clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FX16_16_ABS: abi({ inputs: { hl: "fixed32 in/out pointer" }, clobbers: ["af", "bc", "de", "hl"] }),
  AMY_FX16_16_RND: abi({ inputs: { hl: "fixed32 destination pointer" }, clobbers: ["af", "bc", "de", "hl"] }),

  // BIOS timers, for future Amy timer backend usage.
  INIT_TIMER: abi({ kind: "bios", inputs: { hl: "timer table", de: "timer data block" }, clobbers: ["de", "hl"] }),
  TIME_MGR: abi({ kind: "bios", clobbers: ["af", "de", "hl"] }),
  REQUEST_SIGNAL: abi({ kind: "bios", inputs: { hl: "timer length", a: "repeat flag" }, outputs: { a: "signal number" }, clobbers: ["af", "bc", "de", "hl"] }),
  TEST_SIGNAL: abi({ kind: "bios", inputs: { a: "signal number" }, outputs: { a: "true/false", flags: "Z reflects A" }, clobbers: ["af", "bc", "de", "hl"] }),
  FREE_SIGNAL: abi({ kind: "bios", inputs: { a: "signal number" }, clobbers: ["af", "bc", "de", "hl"] })
});

export const ROUTINE_CLOBBERS = Object.freeze(Object.fromEntries(
  Object.entries(ROUTINE_ABI).map(([name, entry]) => [name, entry.clobbers])
));

export function getRoutineAbi(name) {
  if (!name) return null;
  return ROUTINE_ABI[String(name).trim().toUpperCase()] || null;
}

export function getRoutineClobbers(name) {
  return getRoutineAbi(name)?.clobbers || [];
}

export function getRoutineInputs(name) {
  return getRoutineAbi(name)?.inputs || {};
}

export function getRoutineOutputs(name) {
  return getRoutineAbi(name)?.outputs || {};
}
