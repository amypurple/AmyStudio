/**
 * wavToDsound.js — WAV to ColecoVision dsound converter
 *
 * Ports the wav2cvds v1 algorithm by Amy Bienvenu from Visual Basic 6 to JavaScript.
 * Produces 4-bit PCM RLE nibble data for playback via getput11/_play_dsound /
 * AMY_PLAY_DSOUND.
 *
 * Output data format (gpdsound.s / AMY_PLAY_DSOUND):
 *   Each byte packs two 4-bit samples: (hi_nibble << 4) | lo_nibble
 *   Nibble values 1–15 = SN76489 attenuation (1 = loudest, 15 = near-silent)
 *   Nibble 0 is reserved — never appears as audio data
 *   $00 followed by count N = hold current volume N more sample periods
 *   $00 $00 = end of stream
 *
 * Sample rate formula: CVSampleRate = 3010000 / (step × 13 + 146)
 *   step 0  → ~20616 Hz (highest quality)
 *   step 10 → ~11765 Hz
 *   step 50 →  ~4930 Hz (lowest quality, smallest data)
 */

/**
 * Compute the ColecoVision sample rate for a given step value.
 */
export function cvSampleRate(step) {
  return 3010000 / (step * 13 + 146);
}

export function cvSampleRateInt(step) {
  return Math.trunc(cvSampleRate(step));
}

/**
 * Build the 16-entry SN76489 logarithmic amplitude table.
 * table[level] = PCM amplitude (0–255) corresponding to SN76489 attenuation level.
 *   Level 0  = maximum volume (PCM 255) — reserved, never used as audio nibble.
 *   Level 1  = loudest usable (~211).
 *   Level 15 = quietest usable (~50).
 */
export function buildVolumeTable() {
  const table = new Array(16);
  let out = 150.0;
  for (let i = 15; i >= 0; i--) {
    table[15 - i] = Math.floor(1.4 * Math.floor(out) + 45) & 255;
    out /= 1.26;
  }
  return table;
}

function buildVolumeRangeStats(table) {
  let volumeMax = 0;
  let volumeMin = 256;
  let volumeMiddle = 0;
  for (let i = 0; i < 16; i += 1) {
    volumeMiddle += table[i];
    if (volumeMin > table[i]) volumeMin = table[i];
    if (volumeMax < table[i]) volumeMax = table[i];
  }
  volumeMiddle = Math.floor(volumeMiddle / 16);
  return { volumeMax, volumeMin, volumeMiddle };
}

function floatSampleToUnsignedByte(sample) {
  const normalized = Math.max(-1, Math.min(1, sample || 0));
  return Math.max(0, Math.min(255, Math.floor((normalized * 127.5) + 127.5)));
}

function amplifyUnsignedByte(dataByte, ampPercent) {
  if (ampPercent === 100) return dataByte & 0xFF;
  let value = Math.floor(((ampPercent * (dataByte - 127.5)) / 100) + 127.5);
  if (value > 255) value = 255;
  if (value < 0) value = 0;
  return value & 0xFF;
}

function mapUnsignedByteToColecoLevel(dataByte, table, stats) {
  let adjusted;
  if (dataByte <= 128) {
    adjusted = stats.volumeMin + Math.floor(((stats.volumeMiddle - stats.volumeMin) * dataByte) / 128);
  } else {
    adjusted = stats.volumeMiddle + Math.floor(((stats.volumeMax - stats.volumeMiddle) * (dataByte - 128)) / 127);
  }

  let bestLevel = 0;
  let bestDistance = 256;
  for (let i = 0; i < 16; i += 1) {
    const distance = Math.abs(adjusted - table[i]);
    if (i === 0 || distance < bestDistance) {
      bestDistance = distance;
      bestLevel = i;
    }
  }
  if (bestLevel > 15) bestLevel = 15;
  if (bestLevel < 1) bestLevel = 1;
  return bestLevel;
}

export function decodeDsoundBytes(bytes) {
  const values = Array.from(bytes || []);
  const nibbles = [];
  let lastLevel = 15;
  for (let i = 0; i < values.length; i += 1) {
    const byte = values[i] & 0xFF;
    if (byte !== 0) {
      const hi = (byte >> 4) & 0x0F;
      const lo = byte & 0x0F;
      if (hi > 0) {
        nibbles.push(hi);
        lastLevel = hi;
      }
      if (lo > 0) {
        nibbles.push(lo);
        lastLevel = lo;
      }
      continue;
    }
    const count = values[i + 1] & 0xFF;
    if (count === 0) break;
    for (let repeat = 0; repeat < count; repeat += 1) {
      nibbles.push(lastLevel);
    }
    i += 1;
  }
  return nibbles;
}

export function dsoundNibblesToPreviewSamples(nibbles, { gain = 0.85 } = {}) {
  const table = buildVolumeTable();
  const pcm = new Float32Array(nibbles.length);
  for (let i = 0; i < nibbles.length; i += 1) {
    const level = Math.max(1, Math.min(15, nibbles[i] || 15));
    const unsigned = table[level] & 0xFF;
    pcm[i] = Math.max(-1, Math.min(1, (((unsigned - 127.5) / 127.5) * gain)));
  }
  return pcm;
}

export function dsoundBytesToPreviewSamples(bytes, options = {}) {
  return dsoundNibblesToPreviewSamples(decodeDsoundBytes(bytes), options);
}

/**
 * Parse a WAV ArrayBuffer.
 * Returns { sampleRate, numChannels, bitsPerSample, samples: Float32Array }
 * where samples are normalized to the range -1.0 … +1.0, averaged to mono.
 * Throws on unsupported or malformed files.
 */
export function parseWav(buffer) {
  const view = new DataView(buffer);
  const tag  = (off) =>
    String.fromCharCode(view.getUint8(off), view.getUint8(off+1),
                        view.getUint8(off+2), view.getUint8(off+3));

  if (tag(0) !== "RIFF") throw new Error("Not a valid WAV file (missing RIFF header)");
  if (tag(8) !== "WAVE") throw new Error("Not a valid WAV file (missing WAVE marker)");

  let audioFormat, numChannels, sampleRate, bitsPerSample;
  let dataOffset = -1, dataSize = 0;
  let offset = 12;

  while (offset + 8 <= view.byteLength) {
    const chunkId   = tag(offset);
    const chunkSize = view.getUint32(offset + 4, true);
    offset += 8;

    if (chunkId === "fmt ") {
      audioFormat   = view.getUint16(offset,      true);
      numChannels   = view.getUint16(offset +  2, true);
      sampleRate    = view.getUint32(offset +  4, true);
      bitsPerSample = view.getUint16(offset + 14, true);
    } else if (chunkId === "data") {
      dataOffset = offset;
      dataSize   = chunkSize;
      break;
    }
    offset += chunkSize + (chunkSize & 1); // word-align
  }

  if (dataOffset < 0)
    throw new Error("WAV file has no data chunk");
  if (audioFormat !== 1)
    throw new Error(`WAV must be uncompressed PCM (got audioFormat=${audioFormat})`);
  if (bitsPerSample !== 8 && bitsPerSample !== 16)
    throw new Error(`WAV bit depth must be 8 or 16 (got ${bitsPerSample})`);

  const bytesPerSample = bitsPerSample >> 3;
  const totalFrames    = Math.floor(dataSize / (bytesPerSample * numChannels));
  const samples        = new Float32Array(totalFrames);

  for (let i = 0; i < totalFrames; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const off = dataOffset + (i * numChannels + ch) * bytesPerSample;
      sum += (bitsPerSample === 8)
        ? (view.getUint8(off) - 128) / 128.0
        : view.getInt16(off, true)   / 32768.0;
    }
    samples[i] = sum / numChannels;
  }

  return { sampleRate, numChannels, bitsPerSample, samples };
}

/** Find nearest SN76489 attenuation level (1–15) for a PCM amplitude 0–255. */
function quantize(pcm255, table) {
  let best = 1, bestDist = Math.abs(pcm255 - table[1]);
  for (let l = 2; l <= 15; l++) {
    const d = Math.abs(pcm255 - table[l]);
    if (d < bestDist) { bestDist = d; best = l; }
  }
  return best;
}

/**
 * Downsample and quantize float32 mono samples to a nibble stream (values 1–15).
 *   step       — playback speed step (0 = fastest/best quality)
 *   ampPercent — amplification in percent (100 = unity, 200 = double, etc.)
 */
export function resampleAndQuantize(samples, srcRate, step = 0, ampPercent = 125) {
  const dstRate = cvSampleRateInt(step);
  const table = buildVolumeTable();
  const stats = buildVolumeRangeStats(table);
  const srcLen = samples.length;
  const nibbles = [];
  let counter = srcRate - dstRate;
  let dataByteOld = 0;
  let dataByteNew = 0;

  for (let i = 0; i < srcLen; i += 1) {
    const dataByte = floatSampleToUnsignedByte(samples[i]);
    dataByteOld = dataByteNew;
    dataByteNew = dataByte;
    counter += dstRate;

    if (i >= srcLen - 1) continue;
    if (counter < srcRate) continue;

    counter -= srcRate;

    let outputByte = dataByteNew;
    outputByte = Math.floor((dataByteOld * counter) / dstRate)
      + Math.floor((dataByteNew * (dstRate - counter)) / dstRate);
    outputByte = amplifyUnsignedByte(outputByte, ampPercent);
    nibbles.push(mapUnsignedByteToColecoLevel(outputByte, table, stats));
  }

  return nibbles;
}

/**
 * RLE encode a nibble stream into dsound bytes (wav2cvds v1 encoding).
 * Runs of 4+ identical nibbles use $00 + count to hold the current volume.
 */
export function rleEncodeNibbles(nibbles) {
  const bytes = [];
  const values = Array.from(nibbles || []);
  const count = values.length;
  if (!count) {
    bytes.push(0x00, 0x00);
    return bytes;
  }

  let pos = 0;
  let hi = values[pos++];

  while (true) {
    if (pos >= count) break;

    let lo = values[pos++];
    bytes.push(((hi & 0x0F) << 4) | (lo & 0x0F));

    let oldByte = lo & 0x0F;

    while (true) {
      let dataByte = oldByte;
      let repeatCount = 0;

      while (dataByte === oldByte && pos < count) {
        dataByte = values[pos++] & 0x0F;
        if (dataByte === oldByte) repeatCount += 1;
      }

      const hasNextDistinct = dataByte !== oldByte;
      const newByte = dataByte & 0x0F;

      while (repeatCount > 3) {
        if (repeatCount < 256) {
          bytes.push(0x00, repeatCount & 0xFF);
          repeatCount = 0;
        } else if (repeatCount > 258) {
          bytes.push(0x00, 0xFF);
          repeatCount -= 255;
        } else {
          bytes.push(0x00, (repeatCount - 4) & 0xFF);
          repeatCount = 4;
        }
      }

      while (repeatCount > 1) {
        bytes.push((oldByte << 4) | oldByte);
        repeatCount -= 2;
      }

      if (repeatCount === 1 && hasNextDistinct) {
        bytes.push((oldByte << 4) | newByte);
        oldByte = newByte;
        continue;
      }

      hi = newByte;
      if (hasNextDistinct) break;
      pos = count;
      break;
    }

    if (pos >= count) break;
  }

  bytes.push(0x00, 0x00);
  return bytes;
}

/**
 * Format an encoded byte array as an Amy `data … end data` block.
 */
export function formatAlexisData(label, bytes) {
  const lines = [`data ${label} bytes`];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    lines.push("  " + chunk.map(b => `$${b.toString(16).toUpperCase().padStart(2, "0")}`).join(","));
  }
  lines.push("end data");
  return lines.join("\n");
}

function mixToMonoFromChannels(channelArrays, frameCount) {
  const mono = new Float32Array(frameCount);
  const channelCount = channelArrays.length;
  if (!channelCount) return mono;
  for (let frame = 0; frame < frameCount; frame++) {
    let sum = 0;
    for (let channel = 0; channel < channelCount; channel++) {
      sum += channelArrays[channel][frame] || 0;
    }
    mono[frame] = sum / channelCount;
  }
  return mono;
}

export function audioBufferToMonoSamples(audioBuffer) {
  const frameCount = audioBuffer?.length || 0;
  const channelCount = audioBuffer?.numberOfChannels || 0;
  const channels = [];
  for (let channel = 0; channel < channelCount; channel++) {
    channels.push(audioBuffer.getChannelData(channel));
  }
  return {
    sampleRate: audioBuffer?.sampleRate || 44100,
    samples: mixToMonoFromChannels(channels, frameCount)
  };
}

export function samplesToDsound(samples, sampleRate, { step = 0, ampPercent = 125, label = "SoundData" } = {}) {
  const nibbles      = resampleAndQuantize(samples, sampleRate, step, ampPercent);
  const bytes        = rleEncodeNibbles(nibbles);
  const alexisSource = formatAlexisData(label, bytes);
  const dstRate      = cvSampleRateInt(step);

  return {
    bytes,
    alexisSource,
    nibbleCount : nibbles.length,
    sampleRate  : dstRate,
    durationSec : nibbles.length / dstRate,
    byteCount   : bytes.length,
  };
}

export function audioBufferToDsound(audioBuffer, options = {}) {
  const { sampleRate, samples } = audioBufferToMonoSamples(audioBuffer);
  return samplesToDsound(samples, sampleRate, options);
}

/**
 * Main entry point: convert a WAV ArrayBuffer to dsound output.
 *
 * Options:
 *   step       — playback step 0–50 (0 = highest quality, default 0)
 *   ampPercent — amplification % (default 125)
 *   label      — ALEXIS data label name (default "SoundData")
 *
 * Returns:
 *   { bytes, alexisSource, nibbleCount, sampleRate, durationSec, byteCount }
 */
export function wavToDsound(wavBuffer, { step = 0, ampPercent = 125, label = "SoundData" } = {}) {
  const { sampleRate, samples } = parseWav(wavBuffer);
  return samplesToDsound(samples, sampleRate, { step, ampPercent, label });
}
