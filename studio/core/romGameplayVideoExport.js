import { buildMjpegPcmAvi } from "./mjpegPcmAvi.js";
import { AnimatedGifEncoder, rgb565ToRgb332 } from "./animatedGif.js";

const rgb5To8 = Uint8Array.from({ length: 32 }, (_, value) => Math.round(value * 255 / 31));
const rgb6To8 = Uint8Array.from({ length: 64 }, (_, value) => Math.round(value * 255 / 63));

export const VIDEO_EXPORT_QUALITY_PROFILES = Object.freeze({
  standard: Object.freeze({ id: "standard", label: "Standard 1x", scale: 1, jpegQuality: 0.92 }),
  high: Object.freeze({ id: "high", label: "High 2x", scale: 2, jpegQuality: 0.98 }),
  archive: Object.freeze({ id: "archive", label: "Archive 4x", scale: 4, jpegQuality: 1 })
});

export function videoExportQualityProfile(value = "high") {
  return VIDEO_EXPORT_QUALITY_PROFILES[String(value).toLowerCase()] || VIDEO_EXPORT_QUALITY_PROFILES.high;
}

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error("The browser could not encode a JPEG frame."));
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/jpeg", quality);
  });
}

function renderFramebuffer(canvas, framebuffer, scale = 1) {
  const width = framebuffer.width * scale;
  const height = framebuffer.height * scale;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  const image = context.createImageData(width, height);
  for (let index = 0; index < framebuffer.pixels.length; ++index) {
    const pixel = framebuffer.pixels[index];
    const red = rgb5To8[(pixel >>> 11) & 0x1F];
    const green = rgb6To8[(pixel >>> 5) & 0x3F];
    const blue = rgb5To8[pixel & 0x1F];
    const sourceX = index % framebuffer.width;
    const sourceY = Math.trunc(index / framebuffer.width);
    for (let repeatY = 0; repeatY < scale; repeatY += 1) {
      let offset = ((sourceY * scale + repeatY) * width + sourceX * scale) * 4;
      for (let repeatX = 0; repeatX < scale; repeatX += 1) {
        image.data[offset] = red;
        image.data[offset + 1] = green;
        image.data[offset + 2] = blue;
        image.data[offset + 3] = 255;
        offset += 4;
      }
    }
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
  quality,
  videoQuality = "high",
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
  const profile = videoExportQualityProfile(videoQuality);
  const jpegQuality = Number.isFinite(quality) ? quality : profile.jpegQuality;
  const frames = [];
  let sampleRate = 0;
  try {
    recorder.seek(range.from);
    for (let index = 0; index < range.frameCount; ++index) {
      if (signal?.aborted) throw new DOMException("Video export cancelled.", "AbortError");
      const result = recorder.replayFrame();
      if (result.breakpointHit) throw new Error(`A breakpoint interrupted video export at frame ${recorder.frame}.`);
      const framebuffer = core.getFramebufferView();
      renderFramebuffer(canvas, framebuffer, profile.scale);
      const audio = core.getAudioFrame();
      if (!sampleRate) sampleRate = audio.sampleRate;
      if (audio.sampleRate !== sampleRate || audio.channels !== 2) {
        throw new Error("GearColeco changed audio format during video export.");
      }
      frames.push({
        jpeg: await canvasToJpeg(canvas, jpegQuality),
        audio: audio.samples
      });
      onProgress({ completed: index + 1, total: range.frameCount });
      if ((index % 8) === 7) await nextTask();
    }
    const first = core.getFramebufferView();
    return {
      blob: buildMjpegPcmAvi({
        width: first.width * profile.scale,
        height: first.height * profile.scale,
        fps: core.getFramesPerSecond(),
        sampleRate,
        channels: 2,
        frames
      }),
      ...range,
      fps: core.getFramesPerSecond(),
      sampleRate,
      videoQuality: profile.id,
      width: first.width * profile.scale,
      height: first.height * profile.scale
    };
  } finally {
    recorder.seek(restoreFrame);
  }
}

export async function exportGameplaySession({ core, session, restoreControllerMasks = [0, 0], quality, videoQuality = "high", onProgress = () => {}, onFrame = () => {}, signal }) {
  if (!core) throw new Error("Start the debugger before exporting video.");
  const recording = typeof session?.snapshot === "function" ? session.snapshot() : session;
  if (!recording?.initialState || !recording?.inputs?.length) {
    throw new Error("Record at least one gameplay frame before exporting video.");
  }
  const restoreState = core.saveState();
  const canvas = document.createElement("canvas");
  const profile = videoExportQualityProfile(videoQuality);
  const jpegQuality = Number.isFinite(quality) ? quality : profile.jpegQuality;
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
      renderFramebuffer(canvas, framebuffer, profile.scale);
      const audio = core.getAudioFrame();
      if (!sampleRate) sampleRate = audio.sampleRate;
      if (audio.sampleRate !== sampleRate || audio.channels !== 2) throw new Error("GearColeco changed audio format during video export.");
      frames.push({ jpeg: await canvasToJpeg(canvas, jpegQuality), audio: audio.samples });
      onProgress({ completed: index + 1, total: recording.inputs.length });
      if ((index % 8) === 7) await nextTask();
    }
    const framebuffer = core.getFramebufferView();
    return {
      blob: buildMjpegPcmAvi({
        width: framebuffer.width * profile.scale,
        height: framebuffer.height * profile.scale,
        fps: recording.framesPerSecond || core.getFramesPerSecond(),
        sampleRate,
        channels: 2,
        frames
      }),
      frameCount: frames.length,
      fps: recording.framesPerSecond || core.getFramesPerSecond(),
      sampleRate,
      videoQuality: profile.id,
      width: framebuffer.width * profile.scale,
      height: framebuffer.height * profile.scale
    };
  } finally {
    core.loadState(restoreState, { controllerMasks: restoreControllerMasks });
  }
}

export async function exportGameplayGifSession({ core, session, restoreControllerMasks = [0, 0], targetFps = 15, onProgress = () => {}, signal }) {
  if (!core) throw new Error("Start the debugger before exporting GIF.");
  const recording = typeof session?.snapshot === "function" ? session.snapshot() : session;
  if (!recording?.initialState || !recording?.inputs?.length) throw new Error("Record at least one gameplay frame before exporting GIF.");
  const restoreState = core.saveState();
  const sourceFps = recording.framesPerSecond || core.getFramesPerSecond();
  const stride = Math.max(1, Math.round(sourceFps / targetFps));
  let gif = null;
  let frameCount = 0;
  try {
    core.loadState(recording.initialState, { controllerMasks: recording.initialControllerMasks });
    for (let index = 0; index < recording.inputs.length; ++index) {
      if (signal?.aborted) throw new DOMException("GIF export cancelled.", "AbortError");
      const input = recording.inputs[index];
      for (let port = 0; port < 2; ++port) {
        core.setControllerMask(port, input.controllerMasks[port]);
        if (input.spinnerDeltas[port]) core.setSpinner(port, input.spinnerDeltas[port]);
      }
      const result = core.runFrame();
      if (result.breakpointHit) throw new Error(`A breakpoint interrupted GIF export at frame ${index}.`);
      if ((index % stride) === 0) {
        const framebuffer = core.getFramebufferView();
        gif ||= new AnimatedGifEncoder({ width: framebuffer.width, height: framebuffer.height, fps: sourceFps / stride });
        gif.addFrame(rgb565ToRgb332(framebuffer.pixels));
        frameCount += 1;
      }
      onProgress({ completed: index + 1, total: recording.inputs.length, encoded: frameCount });
      if ((index % 8) === 7) await nextTask();
    }
    return { blob: gif.finish(), frameCount, sourceFrameCount: recording.inputs.length, fps: sourceFps / stride };
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
