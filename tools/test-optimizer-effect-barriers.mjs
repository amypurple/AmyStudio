import assert from "node:assert/strict";

import {
  callClobbersRegister,
  getDirectCallTarget,
  isOptimizerAbsoluteBarrier,
  optimizerLineClobbersRegister
} from "../studio/core/compiler/optimizerEffectHelpers.js";
import { getRegisterFamily, routineClobbersRegister } from "../studio/core/compiler/routineAbi.js";

assert.equal(getRegisterFamily("B"), "bc");
assert.equal(getRegisterFamily("ixl"), "ix");
assert.equal(getRegisterFamily("unknown"), null);

assert.equal(routineClobbersRegister("AMY_WAIT_FRAMES_SAFE", "HL"), false);
assert.equal(routineClobbersRegister("AMY_WAIT_FRAMES_SAFE", "E"), true);
assert.equal(routineClobbersRegister("AMY_PSG_VOLUME", "C"), true, "B clobber invalidates the BC family");
assert.equal(routineClobbersRegister("PUT_FRAME", "IY"), true);
assert.equal(routineClobbersRegister("FILL_VRAM", "HL"), false, "stock OS7 FILL_VRAM preserves HL");
assert.equal(routineClobbersRegister("FILL_VRAM", "BC"), true, "FILL_VRAM replaces C with the fill byte");
assert.equal(routineClobbersRegister("WRITE_REGISTER", "BC"), false, "WRITE_REGISTER preserves its BC input");
assert.equal(routineClobbersRegister("READ_REGISTER", "HL"), false, "READ_REGISTER only changes AF");
assert.equal(routineClobbersRegister("TURN_OFF_SOUND", "BC"), false, "TURN_OFF_SOUND only changes AF");
assert.equal(routineClobbersRegister("UPDATE_CONTROLLERS", "HL"), false, "CONT_SCAN only changes AF");
assert.equal(routineClobbersRegister("UPDATE_SPINNER", "BC"), false, "UPDATE_SPINNER preserves BC");
assert.equal(routineClobbersRegister("UPDATE_SPINNER", "HL"), true, "UPDATE_SPINNER uses HL for BIOS counters");
assert.equal(routineClobbersRegister("SET_SOUND_TABLE", "IX"), false, "SET_SOUND_TABLE preserves IX/IY");
assert.equal(routineClobbersRegister("SET_SOUND_TABLE", "HL"), true, "SET_SOUND_TABLE replaces HL");
assert.equal(routineClobbersRegister("AMY_SET_SOUND_TABLE", "IY"), false, "Amy sound-table wrapper preserves IX/IY");
assert.equal(routineClobbersRegister("PLAY_SOUND_SLOT", "IY"), true, "function-command sounds use IY as an execution pointer");
assert.equal(routineClobbersRegister("UPDATE_SOUND_ADDR", "IX"), true, "sound manager walks areas through IX");
assert.equal(routineClobbersRegister("UPDATE_SOUND_ADDR", "IY"), true, "sound manager can execute function-command streams through IY");
assert.equal(routineClobbersRegister("PLAY_SOUNDS", "IX"), true, "PSG output retains an internal area pointer in IX");
assert.equal(routineClobbersRegister("PLAY_SOUNDS", "IY"), false, "PSG output does not use IY");
assert.equal(routineClobbersRegister("INIT_SPR_ORDER", "DE"), false, "INIT_SPR_ORDER preserves DE");
assert.equal(routineClobbersRegister("INIT_SPR_ORDER", "BC"), true, "INIT_SPR_ORDER replaces B with the count");
assert.equal(routineClobbersRegister("INIT_SPR_ORDER", "HL"), true, "INIT_SPR_ORDER advances the table pointer");
assert.equal(routineClobbersRegister("GET_RANDOM", "BC"), false, "GET_RANDOM preserves BC and DE");
assert.equal(routineClobbersRegister("GET_RANDOM", "HL"), true, "GET_RANDOM returns the updated LFSR in HL");
assert.equal(routineClobbersRegister("PX_TO_PTRN_POS", "BC"), false, "PX_TO_PTRN_POS preserves BC");
assert.equal(routineClobbersRegister("PX_TO_PTRN_POS", "HL"), false, "PX_TO_PTRN_POS saves and restores HL");
assert.equal(routineClobbersRegister("PX_TO_PTRN_POS", "DE"), true, "PX_TO_PTRN_POS returns its result in DE");
assert.equal(routineClobbersRegister("AMY_U32_COPY", "BC"), false, "u32 copy never touches BC");
assert.equal(routineClobbersRegister("AMY_U32_COPY", "HL"), true, "u32 copy advances its destination pointer");
assert.equal(routineClobbersRegister("AMY_U32_SUB", "HL"), false, "u32 subtract restores its destination pointer");
assert.equal(routineClobbersRegister("AMY_U32_SUB", "DE"), false, "u32 subtract restores its source pointer");
assert.equal(routineClobbersRegister("AMY_CMP_U32_MEM", "HL"), false, "u32 compare restores its left pointer");
assert.equal(routineClobbersRegister("AMY_CMP_U32_MEM", "DE"), false, "u32 compare restores its right pointer");
assert.equal(routineClobbersRegister("INIT_TIMER", "BC"), false, "INIT_TIMERS preserves AF and BC");
assert.equal(routineClobbersRegister("TIME_MGR", "BC"), false, "RUN_TIMERS preserves BC");
assert.equal(routineClobbersRegister("REQUEST_SIGNAL", "IX"), false, "START_TIMER preserves IX/IY");
assert.equal(routineClobbersRegister("TEST_SIGNAL", "HL"), true, "TEST_TIMER traverses the timer table in HL");
assert.equal(routineClobbersRegister("POLLER", "HL"), true, "active POLLER paths contradict the historical HL-preserved comment");
assert.equal(routineClobbersRegister("POLLER", "IX"), true, "POLLER retains internal controller-state pointers in IX/IY");
assert.equal(routineClobbersRegister("DECODER", "IX"), false, "direct ReadCtl preserves IX/IY");
assert.equal(routineClobbersRegister("DECODER", "DE"), true, "direct ReadCtl returns raw and spinner state in DE");
assert.equal(routineClobbersRegister("WR_SPR_NM_TBL", "IX"), true, "sprite copy consumes the order pointer through IX");
assert.equal(routineClobbersRegister("WR_SPR_NM_TBL", "IY"), true, "sprite copy uses IY for the BIOS VRAM shadow");
assert.equal(routineClobbersRegister("INIT_TABLE", "DE"), false, "INIT_TABLE does not touch DE");
assert.equal(routineClobbersRegister("INIT_TABLE", "IX"), true, "INIT_TABLE uses IX for the selected BIOS shadow");
assert.equal(routineClobbersRegister("INIT_TABLE", "IY"), true, "ordinary INIT_TABLE paths use IY for shift metadata");
assert.equal(routineClobbersRegister("LOAD_ASCII", "IX"), true, "LOAD_ASCII reaches the indexed BIOS VRAM writer");
assert.equal(routineClobbersRegister("LOAD_ASCII", "IY"), true, "LOAD_ASCII uses IY as the glyph count");
assert.equal(routineClobbersRegister("ROTATE_90", "IX"), true, "raw rotation dispatches through IX");
assert.equal(routineClobbersRegister("ROTATE_90", "IY"), true, "raw rotation uses IY in block VRAM services");
assert.equal(routineClobbersRegister("UNKNOWN_ROUTINE", "HL"), true);

assert.equal(getDirectCallTarget("call nz, AMY_WAIT_FRAMES_SAFE ; guarded"), "AMY_WAIT_FRAMES_SAFE");
assert.equal(callClobbersRegister("call AMY_WAIT_FRAMES_SAFE", "HL"), false);
assert.equal(callClobbersRegister("call AMY_WAIT_FRAMES_SAFE", "DE"), true);
assert.equal(callClobbersRegister("call UPDATE_SOUND_ADDR", "IY"), true);
assert.equal(callClobbersRegister("call UNKNOWN_ROUTINE", "HL"), true);
assert.equal(callClobbersRegister("call (hl)", "HL"), true);

for (const line of [
  "Loop:", "jp Loop", "jr nz,Loop", "djnz Loop", "ret", "reti", "rst $08",
  "exx", "ex af,af'", "di", "ei", "im 1", "in a,($fc)", "out ($7f),a",
  "asm", "__asm"
]) {
  assert.equal(isOptimizerAbsoluteBarrier(line), true, `${line} must be an absolute optimizer barrier`);
}

assert.equal(isOptimizerAbsoluteBarrier("ld hl,$1234"), false);
assert.equal(optimizerLineClobbersRegister("call AMY_WAIT_FRAMES_SAFE", "HL"), false);
assert.equal(optimizerLineClobbersRegister("call AMY_WAIT_FRAMES_SAFE", "A"), true);
assert.equal(optimizerLineClobbersRegister("out ($7f),a", "HL"), true);

console.log("Optimizer effect barriers: ABI overlap and conservative barriers passed.");
