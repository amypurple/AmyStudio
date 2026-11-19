import assert from "node:assert/strict";

import { inferAmyMemoryCapabilities } from "../studio/core/compilerFrontend.js";

const infer = (source) => inferAmyMemoryCapabilities(source, () => false);
const control = infer(`cartridge "CONTROL/AMY/2026"
asm {
Main:
    ret
}
`);
const commented = infer(`cartridge "COMMENT/AMY/2026"
asm {
; This frame comment is documentation, not a runtime dependency.
Main:
    ret ; frame remains a comment here too
}
`);
const realUse = infer(`cartridge "FRAME/AMY/2026"
u8 Tick = 0
  Tick = frame
`);

assert.equal(commented.needsFrameCounter, control.needsFrameCounter, "ASM comments must not link the frame counter");
assert.equal(commented.needsFrameCounter, false, "comment-only frame text must not become a capability");
assert.equal(realUse.needsFrameCounter, true, "a real frame expression must still link the frame counter");

console.log("ASM comment capability inference regression passed.");
