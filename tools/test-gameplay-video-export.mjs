import assert from "node:assert/strict";
import { buildMjpegPcmAvi } from "../studio/core/mjpegPcmAvi.js";
import { normalizeVideoExportRange } from "../studio/core/romGameplayVideoExport.js";

const ascii = (bytes, offset, length) => new TextDecoder().decode(bytes.subarray(offset, offset + length));
const fakeJpeg = Uint8Array.from([0xFF, 0xD8, 0xFF, 0xD9]);
const frames = [
  { jpeg: fakeJpeg, audio: Int16Array.from([1, -1, 2, -2]) },
  { jpeg: fakeJpeg, audio: Int16Array.from([3, -3, 4, -4]) }
];
const blob = buildMjpegPcmAvi({ width: 256, height: 192, fps: 60, sampleRate: 44100, frames });
const bytes = new Uint8Array(await blob.arrayBuffer());
assert.equal(ascii(bytes, 0, 4), "RIFF");
assert.equal(ascii(bytes, 8, 4), "AVI ");
assert.equal(new DataView(bytes.buffer).getUint32(4, true) + 8, bytes.byteLength);
assert.ok(ascii(bytes, 0, bytes.length).includes("MJPG"));
assert.ok(ascii(bytes, 0, bytes.length).includes("movi"));
assert.ok(ascii(bytes, 0, bytes.length).includes("idx1"));
assert.deepEqual(
  normalizeVideoExportRange({ firstAvailableFrame: 10, latestFrame: 80 }, 2, 99),
  { from: 10, to: 80, frameCount: 70 }
);
assert.deepEqual(
  normalizeVideoExportRange({ firstAvailableFrame: 10, latestFrame: 80 }, 25, 25),
  { from: 25, to: 26, frameCount: 1 }
);
console.log("Gameplay video AVI export PASS", bytes.byteLength);

// Record from Boot UI contract: reset, snapshot frame zero, then start playback.
const recorderUi = await (await import("node:fs/promises")).readFile(new URL("../studio/core/romTestRecorderUi.js", import.meta.url), "utf8");
assert.match(recorderUi, /data-action="recordBoot"[^>]*>[^<]*RECORD BOOT/);
assert.match(recorderUi, /startCore\(null, \{ recordGameplayFromBoot: true \}\)/);
const bootStart = recorderUi.indexOf("if (recordGameplayFromBoot)");
assert.ok(bootStart >= 0);
assert.ok(recorderUi.indexOf("gameplayRecording.start(core, { controllerMasks });", bootStart) < recorderUi.indexOf("startPlaybackTimer();", bootStart));
