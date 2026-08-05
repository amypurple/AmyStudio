export class RomTestAudioSink {
  constructor() {
    this.context = null;
    this.nextStartTime = 0;
    this.sources = new Set();
    this.muted = false;
    this.playbackRate = 1;
  }

  async resume() {
    if (!this.context) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) return false;
      this.context = new AudioContextClass({ sampleRate: 44100 });
    }
    if (this.context.state === "suspended") await this.context.resume();
    return this.context.state === "running";
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.muted) this.flush();
  }

  setPlaybackRate(rate) {
    const normalized = Number(rate);
    this.playbackRate = Number.isFinite(normalized) && normalized > 0
      ? normalized
      : 1;
    this.flush();
  }
  push(frame) {
    const context = this.context;
    if (this.muted || !context || context.state !== "running" || !frame.frameCount) return;
    if (this.nextStartTime - context.currentTime > 0.18) this.flush();

    const buffer = context.createBuffer(2, frame.frameCount, frame.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let index = 0; index < frame.frameCount; ++index) {
      left[index] = frame.samples[index * 2] / 32768;
      right[index] = frame.samples[index * 2 + 1] / 32768;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = this.playbackRate;
    source.connect(context.destination);
    source.addEventListener("ended", () => this.sources.delete(source), { once: true });
    this.sources.add(source);
    const startTime = Math.max(context.currentTime + 0.025, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration / this.playbackRate;
  }

  flush() {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // A source that already ended needs no cleanup.
      }
    }
    this.sources.clear();
    this.nextStartTime = this.context?.currentTime || 0;
  }

  async close() {
    this.flush();
    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") await context.close();
  }
}
