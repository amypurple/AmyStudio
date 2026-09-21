function cloneInput(input) {
  return {
    controllerMasks: [input.controllerMasks[0] >>> 0, input.controllerMasks[1] >>> 0],
    spinnerDeltas: [input.spinnerDeltas[0] | 0, input.spinnerDeltas[1] | 0]
  };
}

export class GameplayRecordingSession {
  constructor() {
    this.clear();
  }

  clear() {
    this.recording = false;
    this.initialState = null;
    this.initialControllerMasks = [0, 0];
    this.inputs = [];
    this.framesPerSecond = 0;
  }

  start(core, { controllerMasks = [0, 0] } = {}) {
    if (!core) throw new Error("Start the debugger before recording gameplay.");
    this.initialState = core.saveState();
    this.initialControllerMasks = [controllerMasks[0] >>> 0, controllerMasks[1] >>> 0];
    this.inputs = [];
    this.framesPerSecond = core.getFramesPerSecond();
    this.recording = true;
  }

  append(input) {
    if (this.recording) this.inputs.push(cloneInput(input));
  }

  stop() {
    this.recording = false;
    return this.inputs.length;
  }

  snapshot() {
    if (!this.initialState || !this.inputs.length) {
      throw new Error("Record at least one gameplay frame before exporting video.");
    }
    return {
      initialState: this.initialState.slice(),
      initialControllerMasks: [...this.initialControllerMasks],
      inputs: this.inputs.map(cloneInput),
      framesPerSecond: this.framesPerSecond
    };
  }
}
