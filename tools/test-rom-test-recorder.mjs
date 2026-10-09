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

function deterministicState(bytes) {
  const copy = new Uint8Array(bytes);
  // Desktop GearColeco appends GC_SaveState_Header. Its s64 timestamp starts
  // 16 bytes after the header magic and is metadata, not emulated state.
  const magic = [0x02, 0x09, 0x20, 0x09];
  let header = -1;
  for (let index = copy.length - 4; index >= Math.max(0, copy.length - 256); --index) {
    if (magic.every((byte, offset) => copy[index + offset] === byte)) { header = index; break; }
  }
  if (header < 0 || header + 24 > copy.length) throw new Error("GearColeco save-state header not found.");
  copy.fill(0, header + 16, header + 24);
  return copy;
}

function snapshot(core) {
  const framebuffer = core.getFramebuffer();
  const stateBytes = deterministicState(core.saveState());
  return {
    state: hash(stateBytes),
    stateBytes,
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
  const replay14 = snapshot(core);
  if (replay14.state !== frame14.state) {
    const differences = [];
    for (let index = 0; index < frame14.stateBytes.length; ++index) {
      if (frame14.stateBytes[index] !== replay14.stateBytes[index]) differences.push(index);
    }
    console.error(`save-state mismatch at ${differences.length} byte(s): ${differences.slice(0, 64).join(",")}`);
  }
  assert.deepEqual(replay14, frame14, "forward replay must preserve history");

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
