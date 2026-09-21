const ASCII = new TextEncoder();

function fourcc(value) {
  if (value.length !== 4) throw new RangeError("AVI FourCC values need four characters.");
  return ASCII.encode(value);
}

function writeU16(view, offset, value) {
  view.setUint16(offset, value >>> 0, true);
}

function writeU32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function chunk(id, payload) {
  const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
  const output = new Uint8Array(8 + bytes.byteLength + (bytes.byteLength & 1));
  output.set(fourcc(id), 0);
  writeU32(new DataView(output.buffer), 4, bytes.byteLength);
  output.set(bytes, 8);
  return output;
}

function list(type, parts) {
  const size = 4 + parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(8 + size + (size & 1));
  output.set(fourcc("LIST"), 0);
  writeU32(new DataView(output.buffer), 4, size);
  output.set(fourcc(type), 8);
  let offset = 12;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function mainHeader({ width, height, fps, frameCount, suggestedBufferSize }) {
  const bytes = new Uint8Array(56);
  const view = new DataView(bytes.buffer);
  writeU32(view, 0, Math.round(1_000_000 / fps));
  writeU32(view, 12, 0x10); // AVIF_HASINDEX
  writeU32(view, 16, frameCount);
  writeU32(view, 24, 2);
  writeU32(view, 28, suggestedBufferSize);
  writeU32(view, 32, width);
  writeU32(view, 36, height);
  return chunk("avih", bytes);
}

function videoStream({ width, height, fps, frameCount, suggestedBufferSize }) {
  const header = new Uint8Array(56);
  const headerView = new DataView(header.buffer);
  header.set(fourcc("vids"), 0);
  header.set(fourcc("MJPG"), 4);
  writeU32(headerView, 20, 1);
  writeU32(headerView, 24, fps);
  writeU32(headerView, 32, frameCount);
  writeU32(headerView, 36, suggestedBufferSize);
  writeU32(headerView, 40, 0xFFFFFFFF);
  writeU16(headerView, 52, width);
  writeU16(headerView, 54, height);

  const format = new Uint8Array(40);
  const formatView = new DataView(format.buffer);
  writeU32(formatView, 0, 40);
  writeU32(formatView, 4, width);
  writeU32(formatView, 8, height);
  writeU16(formatView, 12, 1);
  writeU16(formatView, 14, 24);
  format.set(fourcc("MJPG"), 16);
  writeU32(formatView, 20, width * height * 3);
  return list("strl", [chunk("strh", header), chunk("strf", format)]);
}

function audioStream({ sampleRate, channels, totalSampleFrames, suggestedBufferSize }) {
  const bitsPerSample = 16;
  const blockAlign = channels * bitsPerSample / 8;
  const byteRate = sampleRate * blockAlign;
  const header = new Uint8Array(56);
  const headerView = new DataView(header.buffer);
  header.set(fourcc("auds"), 0);
  writeU32(headerView, 20, blockAlign);
  writeU32(headerView, 24, byteRate);
  writeU32(headerView, 32, totalSampleFrames);
  writeU32(headerView, 36, suggestedBufferSize);
  writeU32(headerView, 44, blockAlign);

  const format = new Uint8Array(16);
  const formatView = new DataView(format.buffer);
  writeU16(formatView, 0, 1);
  writeU16(formatView, 2, channels);
  writeU32(formatView, 4, sampleRate);
  writeU32(formatView, 8, byteRate);
  writeU16(formatView, 12, blockAlign);
  writeU16(formatView, 14, bitsPerSample);
  return list("strl", [chunk("strh", header), chunk("strf", format)]);
}

function pcmBytes(samples) {
  return new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
}

export function buildMjpegPcmAvi({ width, height, fps, sampleRate, channels = 2, frames }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError("AVI dimensions must be positive integers.");
  }
  if (!Number.isFinite(fps) || fps <= 0) throw new RangeError("AVI frame rate must be positive.");
  if (!Number.isInteger(sampleRate) || sampleRate < 1) throw new RangeError("AVI sample rate must be positive.");
  if (!Array.isArray(frames) || !frames.length) throw new RangeError("AVI export needs at least one frame.");

  const mediaParts = [];
  const indexEntries = [];
  let mediaOffset = 4; // idx1 offsets are relative to the LIST payload, including 'movi'.
  let totalSampleFrames = 0;
  let maxVideoBytes = 0;
  let maxAudioBytes = 0;
  for (const frame of frames) {
    const jpeg = frame.jpeg instanceof Uint8Array ? frame.jpeg : new Uint8Array(frame.jpeg);
    const audio = frame.audio instanceof Int16Array ? frame.audio : new Int16Array(frame.audio || 0);
    maxVideoBytes = Math.max(maxVideoBytes, jpeg.byteLength);
    maxAudioBytes = Math.max(maxAudioBytes, audio.byteLength);
    totalSampleFrames += Math.floor(audio.length / channels);
    for (const [id, payload, flags] of [["00dc", jpeg, 0x10], ["01wb", pcmBytes(audio), 0]]) {
      const part = chunk(id, payload);
      mediaParts.push(part);
      indexEntries.push({ id, flags, offset: mediaOffset, size: payload.byteLength });
      mediaOffset += part.byteLength;
    }
  }

  const hdrl = list("hdrl", [
    mainHeader({ width, height, fps, frameCount: frames.length, suggestedBufferSize: Math.max(maxVideoBytes, maxAudioBytes) }),
    videoStream({ width, height, fps, frameCount: frames.length, suggestedBufferSize: maxVideoBytes }),
    audioStream({ sampleRate, channels, totalSampleFrames, suggestedBufferSize: maxAudioBytes })
  ]);
  const movi = list("movi", mediaParts);
  const index = new Uint8Array(indexEntries.length * 16);
  const indexView = new DataView(index.buffer);
  indexEntries.forEach((entry, position) => {
    const offset = position * 16;
    index.set(fourcc(entry.id), offset);
    writeU32(indexView, offset + 4, entry.flags);
    writeU32(indexView, offset + 8, entry.offset);
    writeU32(indexView, offset + 12, entry.size);
  });
  const idx1 = chunk("idx1", index);
  const riffSize = 4 + hdrl.byteLength + movi.byteLength + idx1.byteLength;
  if (riffSize + 8 > 0xFFFFFFFF) throw new RangeError("AVI export exceeds the 4 GiB RIFF limit.");
  const riff = new Uint8Array(12);
  riff.set(fourcc("RIFF"), 0);
  writeU32(new DataView(riff.buffer), 4, riffSize);
  riff.set(fourcc("AVI "), 8);
  return new Blob([riff, hdrl, movi, idx1], { type: "video/x-msvideo" });
}
