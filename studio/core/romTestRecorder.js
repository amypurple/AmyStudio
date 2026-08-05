function normalizeControllerMasks(value) {
  const masks = value || [0, 0];
  return [masks[0] >>> 0, masks[1] >>> 0];
}

function normalizeSpinnerDeltas(value) {
  const deltas = value || [0, 0];
  return [deltas[0] | 0, deltas[1] | 0];
}

function cloneFrameInput(input) {
  return {
    controllerMasks: [...input.controllerMasks],
    spinnerDeltas: [...input.spinnerDeltas]
  };
}

export class RomTestRecorder {
  constructor(core, { keyframeInterval = 12, maxKeyframes = 120 } = {}) {
    if (!core) throw new TypeError("RomTestRecorder requires an emulator core.");
    if (!Number.isInteger(keyframeInterval) || keyframeInterval < 1) {
      throw new RangeError("keyframeInterval must be a positive integer.");
    }
    if (!Number.isInteger(maxKeyframes) || maxKeyframes < 2) {
      throw new RangeError("maxKeyframes must be at least 2.");
    }
    this.core = core;
    this.keyframeInterval = keyframeInterval;
    this.maxKeyframes = maxKeyframes;
    this.recording = false;
    this.frame = 0;
    this.latestFrame = 0;
    this.firstAvailableFrame = 0;
    this.controllerMasks = [0, 0];
    this.frameInputs = new Map();
    this.keyframes = [];
    this.pendingInput = null;
  }

  start({ controllerMasks = [0, 0] } = {}) {
    this.controllerMasks = normalizeControllerMasks(controllerMasks);
    for (let port = 0; port < 2; ++port) {
      this.core.setControllerMask(port, this.controllerMasks[port]);
    }
    this.frame = 0;
    this.latestFrame = 0;
    this.firstAvailableFrame = 0;
    this.frameInputs.clear();
    this.keyframes = [this.captureKeyframe(0)];
    this.pendingInput = null;
    this.recording = true;
  }

  stop() {
    this.recording = false;
  }

  captureKeyframe(frame) {
    return {
      frame,
      state: this.core.saveState(),
      controllerMasks: [...this.controllerMasks]
    };
  }

  truncateFuture() {
    if (this.frame >= this.latestFrame) return;
    for (const inputFrame of [...this.frameInputs.keys()]) {
      if (inputFrame >= this.frame) this.frameInputs.delete(inputFrame);
    }
    this.keyframes = this.keyframes.filter(({ frame }) => frame <= this.frame);
    if (!this.keyframes.some(({ frame }) => frame === this.frame)) {
      this.keyframes.push(this.captureKeyframe(this.frame));
      this.keyframes.sort((left, right) => left.frame - right.frame);
    }
    this.latestFrame = this.frame;
  }

  runFrame({
    controllerMasks = this.controllerMasks,
    spinnerDeltas = [0, 0]
  } = {}) {
    if (!this.recording) {
      throw new Error("Recorder must be started before running frames.");
    }
    this.truncateFuture();
    const input = this.pendingInput || {
      controllerMasks: normalizeControllerMasks(controllerMasks),
      spinnerDeltas: normalizeSpinnerDeltas(spinnerDeltas)
    };
    this.applyInput(input);
    this.frameInputs.set(this.frame, cloneFrameInput(input));
    const result = this.core.runFrame();
    if (result.breakpointHit) {
      this.pendingInput = cloneFrameInput(input);
      return { ...result, frame: this.frame };
    }
    this.pendingInput = null;
    ++this.frame;
    this.latestFrame = this.frame;
    if ((this.frame % this.keyframeInterval) === 0) {
      this.keyframes.push(this.captureKeyframe(this.frame));
      this.pruneHistory();
    }
    return { ...result, frame: this.frame };
  }

  replayFrame() {
    if (this.frame >= this.latestFrame) {
      throw new RangeError("No recorded future frame is available.");
    }
    const input = this.frameInputs.get(this.frame);
    if (!input) throw new Error(`Missing recorded input for frame ${this.frame}.`);
    this.applyInput(input);
    const result = this.core.runFrame();
    if (!result.breakpointHit) ++this.frame;
    return { ...result, frame: this.frame };
  }
  applyInput(input) {
    for (let port = 0; port < 2; ++port) {
      this.core.setControllerMask(port, input.controllerMasks[port]);
      if (input.spinnerDeltas[port]) {
        this.core.setSpinner(port, input.spinnerDeltas[port]);
      }
    }
    this.controllerMasks = [...input.controllerMasks];
  }

  pruneHistory() {
    while (this.keyframes.length > this.maxKeyframes) this.keyframes.shift();
    this.firstAvailableFrame = this.keyframes[0].frame;
    for (const inputFrame of [...this.frameInputs.keys()]) {
      if (inputFrame < this.firstAvailableFrame) {
        this.frameInputs.delete(inputFrame);
      }
    }
  }

  seek(targetFrame) {
    if (!Number.isInteger(targetFrame)) {
      throw new TypeError("Target frame must be an integer.");
    }
    if (targetFrame < this.firstAvailableFrame || targetFrame > this.latestFrame) {
      throw new RangeError(
        `Frame ${targetFrame} is outside the retained range ` +
        `${this.firstAvailableFrame}..${this.latestFrame}.`
      );
    }
    let keyframe = this.keyframes[0];
    for (const candidate of this.keyframes) {
      if (candidate.frame > targetFrame) break;
      keyframe = candidate;
    }
    this.core.loadState(keyframe.state, {
      controllerMasks: keyframe.controllerMasks
    });
    this.controllerMasks = [...keyframe.controllerMasks];
    this.frame = keyframe.frame;
    this.pendingInput = null;
    while (this.frame < targetFrame) {
      const input = this.frameInputs.get(this.frame);
      if (!input) throw new Error(`Missing recorded input for frame ${this.frame}.`);
      this.applyInput(input);
      const result = this.core.runFrame();
      if (result.breakpointHit) {
        throw new Error(
          `Unexpected breakpoint while replaying frame ${this.frame}.`
        );
      }
      ++this.frame;
    }
    return this.frame;
  }

  getRecordedInputs({ from = 0, to = this.latestFrame } = {}) {
    if (from < this.firstAvailableFrame) {
      throw new RangeError(
        `Inputs before frame ${this.firstAvailableFrame} are no longer retained.`
      );
    }
    const inputs = [];
    for (let frame = from; frame < to; ++frame) {
      const input = this.frameInputs.get(frame);
      if (!input) throw new Error(`Missing recorded input for frame ${frame}.`);
      inputs.push(cloneFrameInput(input));
    }
    return inputs;
  }
  getTimeline() {
    return {
      frame: this.frame,
      latestFrame: this.latestFrame,
      firstAvailableFrame: this.firstAvailableFrame,
      keyframes: this.keyframes.map(({ frame }) => frame)
    };
  }
}
