import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";
import { RomTestRecorder } from "../studio/core/romTestRecorder.js";

const repoRoot = resolve(import.meta.dirname, "..");
const [bios, rom] = await Promise.all([
  readFile(resolve(repoRoot, "studio/bios/colecovision.rom")),
  readFile(resolve(
    repoRoot,
    "build/rom-tests/warrior-dan2-fire-visual-test.rom"
  ))
]);

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function snapshot(core) {
  const framebuffer = core.getFramebuffer();
  return {
    state: hash(core.saveState()),
    framebuffer: hash(new Uint8Array(framebuffer.pixels.buffer)),
    vram: hash(core.readVram(0, 0x4000)),
    vdp: [...core.getVdpRegisters()]
  };
}

const core = await GearcolecoTestCore.create({ seed: 0x19770527 });
try {
  core.loadBios(bios);
  core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  const recorder = new RomTestRecorder(core, {
    keyframeInterval: 4,
    maxKeyframes: 4
  });
  recorder.start();

  for (let frame = 0; frame < 14; ++frame) {
    const fire = frame >= 3 && frame < 5;
    recorder.runFrame({
      controllerMasks: [
        fire ? GEARCOLECO_TEST_INPUT.FIRE_RIGHT : 0,
        0
      ]
    });
  }
  const frame14 = snapshot(core);

  recorder.seek(8);
  for (let frame = 8; frame < 14; ++frame) recorder.replayFrame();
  assert.equal(recorder.getTimeline().latestFrame, 14);
  assert.deepEqual(snapshot(core), frame14, "forward replay must preserve history");

  recorder.seek(8);
  recorder.seek(14);  assert.deepEqual(snapshot(core), frame14, "seek/replay must be byte-exact");

  recorder.seek(10);
  recorder.runFrame({
    controllerMasks: [GEARCOLECO_TEST_INPUT.LEFT, 0]
  });
  assert.equal(recorder.getTimeline().latestFrame, 11);
  assert.throws(() => recorder.seek(14), /outside the retained range/);

  for (let frame = 0; frame < 12; ++frame) recorder.runFrame();
  const timeline = recorder.getTimeline();
  assert.ok(timeline.firstAvailableFrame > 0, "history must be bounded");
  assert.ok(timeline.keyframes.length <= 4, "keyframe cap must be enforced");

  console.log("ROM test recorder PASS");
  console.log(JSON.stringify(timeline, null, 2));
} finally {
  core.destroy();
}
