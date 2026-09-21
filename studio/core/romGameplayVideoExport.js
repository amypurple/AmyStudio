import { buildMjpegPcmAvi } from "./mjpegPcmAvi.js";

const rgb5To8 = Uint8Array.from({ length: 32 }, (_, value) => Math.round(value * 255 / 31));
const rgb6To8 = Uint8Array.from({ length: 64 }, (_, value) => Math.round(value * 255 / 63));

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error("The browser could not encode a JPEG frame."));
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/jpeg", quality);
  });
}

function renderFramebuffer(canvas, framebuffer) {
  if (canvas.width !== framebuffer.width) canvas.width = framebuffer.width;
  if (canvas.height !== framebuffer.height) canvas.height = framebuffer.height;
  const context = canvas.getContext("2d", { alpha: false });
  const image = context.createImageData(framebuffer.width, framebuffer.height);
  for (let index = 0; index < framebuffer.pixels.length; ++index) {
    const pixel = framebuffer.pixels[index];
    const offset = index * 4;
    image.data[offset] = rgb5To8[(pixel >>> 11) & 0x1F];
    image.data[offset + 1] = rgb6To8[(pixel >>> 5) & 0x3F];
    image.data[offset + 2] = rgb5To8[pixel & 0x1F];
    image.data[offset + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

function nextTask() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function normalizeVideoExportRange(timeline, from, to) {
  const start = Math.max(timeline.firstAvailableFrame, Math.min(timeline.latestFrame - 1, Math.trunc(from)));
  const end = Math.max(start + 1, Math.min(timeline.latestFrame, Math.trunc(to)));
  return { from: start, to: end, frameCount: end - start };
}

export async function exportRecordedGameplay({
  recorder,
  core,
  from,
  to,
  quality = 0.9,
  onProgress = () => {},
  signal
}) {
  if (!recorder || !core) throw new Error("Start the debugger before exporting video.");
  const timeline = recorder.getTimeline();
  if (timeline.latestFrame <= timeline.firstAvailableFrame) {
    throw new Error("Play or record at least one frame before exporting video.");
  }
  const range = normalizeVideoExportRange(timeline, from, to);
  const restoreFrame = timeline.frame;
  const canvas = document.createElement("canvas");
  const frames = [];
  let sampleRate = 0;
  try {
    recorder.seek(range.from);
    for (let index = 0; index < range.frameCount; ++index) {
      if (signal?.aborted) throw new DOMException("Video export cancelled.", "AbortError");
      const result = recorder.replayFrame();
      if (result.breakpointHit) throw new Error(`A breakpoint interrupted video export at frame ${recorder.frame}.`);
      const framebuffer = core.getFramebufferView();
      renderFramebuffer(canvas, framebuffer);
      const audio = core.getAudioFrame();
      if (!sampleRate) sampleRate = audio.sampleRate;
      if (audio.sampleRate !== sampleRate || audio.channels !== 2) {
        throw new Error("GearColeco changed audio format during video export.");
      }
      frames.push({
        jpeg: await canvasToJpeg(canvas, quality),
        audio: audio.samples
      });
      onProgress({ completed: index + 1, total: range.frameCount });
      if ((index % 8) === 7) await nextTask();
    }
    const first = core.getFramebufferView();
    return {
      blob: buildMjpegPcmAvi({
        width: first.width,
        height: first.height,
        fps: core.getFramesPerSecond(),
        sampleRate,
        channels: 2,
        frames
      }),
      ...range,
      fps: core.getFramesPerSecond(),
      sampleRate
    };
  } finally {
    recorder.seek(restoreFrame);
  }
}

export async function exportGameplaySession({ core, session, restoreControllerMasks = [0, 0], quality = 0.9, onProgress = () => {}, onFrame = () => {}, signal }) {
  if (!core) throw new Error("Start the debugger before exporting video.");
  const recording = typeof session?.snapshot === "function" ? session.snapshot() : session;
  if (!recording?.initialState || !recording?.inputs?.length) {
    throw new Error("Record at least one gameplay frame before exporting video.");
  }
  const restoreState = core.saveState();
  const canvas = document.createElement("canvas");
  const frames = [];
  let sampleRate = 0;
  try {
    core.loadState(recording.initialState, { controllerMasks: recording.initialControllerMasks });
    for (let index = 0; index < recording.inputs.length; ++index) {
      if (signal?.aborted) throw new DOMException("Video export cancelled.", "AbortError");
      const input = recording.inputs[index];
      for (let port = 0; port < 2; ++port) {
        core.setControllerMask(port, input.controllerMasks[port]);
        if (input.spinnerDeltas[port]) core.setSpinner(port, input.spinnerDeltas[port]);
      }
      const result = core.runFrame();
      if (result.breakpointHit) throw new Error(`A breakpoint interrupted video export at frame ${index}.`);
      const framebuffer = core.getFramebufferView();
      onFrame({ index, framebuffer });
      renderFramebuffer(canvas, framebuffer);
      const audio = core.getAudioFrame();
      if (!sampleRate) sampleRate = audio.sampleRate;
      if (audio.sampleRate !== sampleRate || audio.channels !== 2) throw new Error("GearColeco changed audio format during video export.");
      frames.push({ jpeg: await canvasToJpeg(canvas, quality), audio: audio.samples });
      onProgress({ completed: index + 1, total: recording.inputs.length });
      if ((index % 8) === 7) await nextTask();
    }
    const framebuffer = core.getFramebufferView();
    return {
      blob: buildMjpegPcmAvi({
        width: framebuffer.width,
        height: framebuffer.height,
        fps: recording.framesPerSecond || core.getFramesPerSecond(),
        sampleRate,
        channels: 2,
        frames
      }),
      frameCount: frames.length,
      fps: recording.framesPerSecond || core.getFramesPerSecond(),
      sampleRate
    };
  } finally {
    core.loadState(restoreState, { controllerMasks: restoreControllerMasks });
  }
}

export function downloadGameplayVideo(blob, filename = "amy-studio-gameplay.avi") {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
