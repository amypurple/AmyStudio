import assert from "node:assert/strict";
import { RomTestAudioSink } from "../studio/core/romTestAudioSink.js";

const starts = [];
const stops = [];
class FakeSource {
  constructor() {
    this.playbackRate = { value: 1 };
  }
  addEventListener() {}
  connect() {}
  start(time) { starts.push(time); }
  stop() { stops.push(true); }
}
class FakeAudioContext {
  constructor() {
    this.currentTime = 1;
    this.destination = {};
    this.state = "running";
  }
  createBuffer(channels, frames, sampleRate) {
    assert.equal(channels, 2);
    assert.equal(sampleRate, 44100);
    const data = [new Float32Array(frames), new Float32Array(frames)];
    return {
      duration: frames / sampleRate,
      getChannelData: (channel) => data[channel]
    };
  }
  createBufferSource() { return new FakeSource(); }
  async resume() {}
  async close() { this.state = "closed"; }
}

globalThis.AudioContext = FakeAudioContext;
const sink = new RomTestAudioSink();
assert.equal(await sink.resume(), true);
sink.setPlaybackRate(2);
sink.push({
  sampleRate: 44100,
  channels: 2,
  frameCount: 2,
  samples: new Int16Array([32767, -32768, 0, 16384])
});
assert.equal(starts.length, 1);
sink.setMuted(true);
assert.equal(stops.length, 1);
sink.push({
  sampleRate: 44100,
  channels: 2,
  frameCount: 1,
  samples: new Int16Array([1, 1])
});
assert.equal(starts.length, 1);
await sink.close();

console.log("ROM test audio sink PASS");
