import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";

const bios = readFileSync(new URL("../studio/bios/colecovision.rom", import.meta.url));
const rom = readFileSync(new URL("./fixtures/vdp-timing/vt.bin", import.meta.url));

async function run(realistic) {
  const core = await GearcolecoTestCore.create({ seed: 0x56445054 });
  try {
    core.setVideoChip("tms9918a");
    core.setAccurateVdpTiming(realistic);
    assert.equal(core.getAccurateVdpTiming(), realistic);
    core.loadBios(bios);
    core.loadRom(rom);
    let frames = 0;
    while (core.readRam(0x7000, 1)[0] !== 1 && frames < 600) {
      core.runFrame();
      frames++;
    }
    core.runFrame();
    core.runFrame();
    return {
      frames,
      dropped: core.getDroppedVramAccesses(),
      vram: core.readVram(0x3800, 48 * 32)
    };
  } finally {
    core.destroy();
  }
}

const compatible = await run(false);
const realistic = await run(true);
assert.equal(compatible.dropped, 0, "compatible mode must preserve immediate VRAM access");
assert.ok(realistic.dropped > 0, "realistic mode must expose deliberately unsafe VDP bursts");
assert.notDeepEqual(realistic.vram, compatible.vram, "the timing validation ROM must render different VRAM results");
console.log(`PASS: compatible=${compatible.frames} frames, realistic drops=${realistic.dropped}`);
