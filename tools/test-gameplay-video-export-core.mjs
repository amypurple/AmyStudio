import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { GameplayRecordingSession } from "../studio/core/gameplayRecordingSession.js";
import { exportGameplayGifSession, exportGameplaySession } from "../studio/core/romGameplayVideoExport.js";

const repoRoot = resolve(import.meta.dirname, "..");
const [bios, rom] = await Promise.all([
  readFile(resolve(repoRoot, "studio/bios/colecovision.rom")),
  readFile(resolve(repoRoot, "build/rom-tests/warrior-dan2-fire-visual-test.rom"))
]);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fakeJpeg = Uint8Array.from([0xFF, 0xD8, 0xFF, 0xD9]);
globalThis.document = {
  createElement(name) {
    assert.equal(name, "canvas");
    return {
      width: 0,
      height: 0,
      getContext() {
        return {
          createImageData(width, height) { return { width, height, data: new Uint8ClampedArray(width * height * 4) }; },
          putImageData() {}
        };
      },
      toBlob(callback) { callback(new Blob([fakeJpeg], { type: "image/jpeg" })); }
    };
  }
};

const core = await GearcolecoTestCore.create({ seed: 0x19770527 });
try {
  core.loadBios(bios);
  core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < 12; ++frame) core.runFrame();
  const session = new GameplayRecordingSession();
  session.start(core);
  const expectedFrames = [];
  for (let frame = 0; frame < 600; ++frame) {
    const input = { controllerMasks: [0, 0], spinnerDeltas: [0, 0] };
    core.runFrame();
    expectedFrames.push(hash(new Uint8Array(core.getFramebuffer().pixels.buffer)));
    session.append(input);
  }
  session.stop();
  const stateAfterRecording = hash(core.saveState());
  const repeatedStateAfterRecording = hash(core.saveState());
  assert.equal(repeatedStateAfterRecording, stateAfterRecording, "consecutive save states must be byte-stable");
  const replayedFrames = [];
  const sessionResult = await exportGameplaySession({
    core,
    session,
    onFrame({ framebuffer }) {
      replayedFrames.push(hash(new Uint8Array(
        framebuffer.pixels.buffer,
        framebuffer.pixels.byteOffset,
        framebuffer.pixels.byteLength
      )));
    }
  });
  assert.equal(sessionResult.frameCount, 600);
  assert.deepEqual(replayedFrames, expectedFrames, "every replayed video framebuffer must match the original recording");
  assert.equal(hash(new Uint8Array(core.getFramebuffer().pixels.buffer)), expectedFrames.at(-1), "export must restore the visible framebuffer");
  assert.equal(sessionResult.fps, 60);
  assert.ok(sessionResult.sampleRate > 0);
  const bytes = new Uint8Array(await sessionResult.blob.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 4)), "RIFF");
  const cpuBeforeGif = core.getCpuState();
  const ramBeforeGif = hash(core.readRam(0, 0x10000));
  const vramBeforeGif = hash(core.readVram(0, 0x4000));
  const registersBeforeGif = [...core.getVdpRegisters()];
  const gifResult = await exportGameplayGifSession({ core, session });
  assert.equal(gifResult.frameCount, 150);
  assert.equal(gifResult.sourceFrameCount, 600);
  assert.equal(gifResult.fps, 15);
  assert.deepEqual(core.getCpuState(), cpuBeforeGif, "GIF export must restore CPU state");
  assert.equal(hash(core.readRam(0, 0x10000)), ramBeforeGif, "GIF export must restore RAM");
  assert.equal(hash(core.readVram(0, 0x4000)), vramBeforeGif, "GIF export must restore VRAM");
  assert.deepEqual([...core.getVdpRegisters()], registersBeforeGif, "GIF export must restore VDP registers");
  assert.equal(hash(new Uint8Array(core.getFramebuffer().pixels.buffer)), expectedFrames.at(-1), "GIF export must restore the visible framebuffer");
  const gifBytes = new Uint8Array(await gifResult.blob.arrayBuffer());
  assert.equal(new TextDecoder().decode(gifBytes.subarray(0, 6)), "GIF89a");
  console.log(`GearColeco independent gameplay video export PASS (${sessionResult.frameCount} AVI frames, ${gifResult.frameCount} GIF frames)`);
} finally {
  core.destroy();
}
