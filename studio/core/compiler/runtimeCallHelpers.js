export const RUNTIME_CLOBBERS = {
  AMY_PUT_CHAR_AT: ["af", "bc", "de", "hl"],
  AMY_GET_CHAR_AT: ["af", "bc", "de", "hl"],
  AMY_FILL_AT: ["af", "bc", "de", "hl"],
  AMY_FILL_VRAM: ["af", "bc", "de", "hl"],
  AMY_COPY_BYTES_TO_VRAM: ["af", "bc", "de", "hl"],
  AMY_SET_GRAPHICS_MODE1_BITMAP: ["af", "bc", "de", "hl"],
  AMY_MODE2_PSET: ["af", "bc", "hl"],
  AMY_MODE2_PRESET: ["af", "bc", "hl"],
  AMY_MODE2_PSET_COLOR: ["af", "bc", "hl"],
  AMY_MODE2_LINE: ["af", "bc", "de", "hl"],
  AMY_MODE2_LINE_COLOR: ["af", "bc", "de", "hl"],
  AMY_MODE2_CIRCLE: ["af", "bc", "de", "hl"],
  AMY_MODE2_CIRCLE_COLOR: ["af", "bc", "de", "hl"],
  AMY_UPDATE_SPRITES: ["af", "de", "hl"],
  AMY_WIPE_SCREEN_UP: ["af", "bc", "de", "hl"],
  AMY_WIPE_SCREEN_DOWN: ["af", "bc", "de", "hl"],
  AMY_WIPE_BITMAP_UP: ["af", "bc", "de", "hl"],
  AMY_WIPE_BITMAP_DOWN: ["af", "bc", "de", "hl"],
  AMY_PLAY_DSOUND: ["af", "bc", "de", "hl"],
  AMY_PLAY_SOUND: ["af", "bc", "de", "hl"],
  AMY_STOP_SOUND: ["af", "bc", "de", "hl"],
  AMY_WAIT_FRAMES_SAFE: ["af", "de"],
  AMY_LOAD_DEFAULT_ASCII_STYLE: ["af", "bc", "de", "hl"],
  WRITE_VRAM: ["af", "bc", "de", "hl"],
  FILL_VRAM: ["af", "bc", "de", "hl"],
  CALC_OFFSET: ["af", "de"]
};

export function emitSafeCall(funcName, liveRegs, runtimeClobbers = RUNTIME_CLOBBERS) {
  const clobbers = runtimeClobbers[funcName] || [];
  const toSave = liveRegs.filter((r) => clobbers.includes(r));
  const pushes = toSave.map((r) => `    push ${r}`);
  const pops = [...toSave].reverse().map((r) => `    pop ${r}`);
  return [...pushes, `    call ${funcName}`, ...pops];
}
