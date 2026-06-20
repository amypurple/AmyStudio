export function createProjectFileDsoundAddon({
  projectFileBytes,
  dsoundBytesToPreviewSamples,
  cvSampleRate,
  setStatus
}) {
  let activePreviewUrl = "";
  let activePreviewAudio = null;

  function encodePreviewWav(samples, sampleRate) {
    const frameCount = samples.length;
    const dataSize = frameCount * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeTag = (offset, text) => {
      for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
    };
    writeTag(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeTag(8, "WAVE");
    writeTag(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeTag(36, "data");
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < frameCount; i += 1) {
      const clamped = Math.max(-1, Math.min(1, samples[i] || 0));
      view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

  async function previewProjectFileDsound(entry) {
    const bytes = projectFileBytes(entry);
    if (!bytes.length) {
      setStatus(`No bytes available for ${entry.path}.`);
      return;
    }
    if (!dsoundBytesToPreviewSamples) {
      setStatus("DSOUND preview helper is unavailable in this Studio build.");
      return;
    }
    if (activePreviewUrl) {
      URL.revokeObjectURL(activePreviewUrl);
      activePreviewUrl = "";
    }
    if (activePreviewAudio) {
      activePreviewAudio.pause?.();
      activePreviewAudio = null;
    }
    const sampleRate = Number.isFinite(entry?.dsoundStep) ? Math.trunc(cvSampleRate(entry.dsoundStep)) : 20616;
    const previewSamples = dsoundBytesToPreviewSamples(bytes);
    const wavBlob = encodePreviewWav(previewSamples, sampleRate);
    activePreviewUrl = URL.createObjectURL(wavBlob);
    activePreviewAudio = new Audio(activePreviewUrl);
    try {
      await activePreviewAudio.play();
      setStatus(`Playing preview for ${entry.path}.`);
    } catch {
      setStatus(`Preview ready for ${entry.path}, but playback was blocked by the browser.`);
    }
  }

  return { previewProjectFileDsound };
}
