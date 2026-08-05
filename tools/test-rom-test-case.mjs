import assert from "node:assert/strict";
import {
  createRomTestCase,
  decodeRomTestInputs,
  listAmyCheckpoints,
  resolveAmyCheckpoint
} from "../studio/core/romTestCase.js";

const before = "00:8123 AMY_ULBL_TEST_ready\n00:9000 OTHER";
const rebuilt = "00:8ABC AMY_ULBL_TEST_ready\n00:9000 OTHER";
assert.deepEqual(listAmyCheckpoints(before), ["ready"]);
assert.equal(resolveAmyCheckpoint(before, "ready").address, 0x8123);
assert.equal(resolveAmyCheckpoint(rebuilt, "ready").address, 0x8ABC);
assert.equal(resolveAmyCheckpoint("AMY_ULBL_TEST_web: equ $8FED", "web").address, 0x8FED);

const inputs = [
  { controllerMasks: [0, 0], spinnerDeltas: [0, 0] },
  { controllerMasks: [0, 0], spinnerDeltas: [0, 0] },
  { controllerMasks: [16, 0], spinnerDeltas: [0, 0] },
  { controllerMasks: [0, 0], spinnerDeltas: [2, 0] }
];
const testCase = createRomTestCase({
  name: "Rebuild-stable checkpoint",
  projectName: "selftest",
  seed: 7,
  biosSha256: "bios",
  romSha256: "rom",
  inputs,
  checkpoint: { name: "AMY_ULBL_TEST_ready", occurrence: 2 },
  assertions: {
    framebufferSha256: "frame",
    vramSha256: "vram",
    vdpRegisters: [0, 0xE2]
  }
});
assert.equal(testCase.target.name, "ready");
assert.equal(testCase.target.occurrence, 2);
assert.equal(createRomTestCase({ inputs }).target.frame, inputs.length);
assert.equal(testCase.inputRuns.length, 3);
assert.deepEqual(decodeRomTestInputs(testCase.inputRuns), inputs);

console.log("ROM test case format PASS");
