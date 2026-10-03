import assert from "node:assert/strict";
import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";

const core = await GearcolecoTestCore.create();

try {
  core.setAdamSoundExpansion("none");
  core.debugAdamPortOut(0x50, 8);
  core.debugAdamPortOut(0x51, 13);
  assert.equal(core.debugAdamPortIn(0x52), 0xff, "absent ADAM AY must leave port $52 open");

  for (const profile of ["enhancer", "sgm"]) {
    core.setAdamSoundExpansion(profile);
    core.debugAdamPortOut(0x50, 8);
    core.debugAdamPortOut(0x51, 13);
    assert.equal(core.debugAdamPortIn(0x52), 13, `${profile} AY register readback`);

    core.debugAdamPortOut(0x50, 9);
    core.debugAdamPortOut(0x51, 7);
    assert.equal(core.debugAdamPortIn(0x52), 7, `${profile} AY second-register readback`);
  }

  console.log("GearColeco ADAM sound expansions: Sound Enhancer and Opcode SGM passed");
} finally {
  core.destroy();
}
