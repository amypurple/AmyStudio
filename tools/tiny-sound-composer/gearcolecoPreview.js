import { compileGeneratedAsm } from "../../studio/core/internalCompilerClient.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../../studio/core/gearcolecoTestCore.js";

function nextTask() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function startGearcolecoAudition(asm, { frames = 384 } = {}) {
  const compiled = await compileGeneratedAsm(asm, "tiny-sound-audition.asm", {
    optimizerEnabled: false,
    targetPlatform: "colecovision-cartridge",
    amyTarget: "colecovision-cartridge"
  });
  if (!compiled?.ok || !compiled.binary) throw new Error(compiled?.log || "Could not assemble the audition ROM.");

  const biosResponse = await fetch("../../studio/bios/colecovision.rom");
  if (!biosResponse.ok) throw new Error(`Cannot load ColecoVision BIOS (${biosResponse.status}).`);
  const bios = new Uint8Array(await biosResponse.arrayBuffer());
  const core = await GearcolecoTestCore.create();
  const chunks = [];
  let sampleRate = 0;
  let frameCount = 0;
  try {
    core.loadBios(bios);
    core.loadRom(compiled.binary, { region: GEARCOLECO_TEST_REGION.NTSC });
    core.reset();
    for (let frame = 0; frame < frames; frame += 1) {
      core.runFrame();
      const audio = core.getAudioFrame();
      if (!sampleRate) sampleRate = audio.sampleRate;
      if (audio.sampleRate !== sampleRate || audio.channels !== 2) throw new Error("GearColeco changed its audio format.");
      chunks.push(audio.samples);
      frameCount += audio.frameCount;
      if ((frame & 31) === 31) await nextTask();
    }
  } finally {
    core.destroy();
  }

  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) throw new Error("This browser cannot play GearColeco audio.");
  const context = new AudioContextClass({ sampleRate });
  const buffer = context.createBuffer(2, frameCount, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  let output = 0;
  for (const chunk of chunks) {
    for (let input = 0; input + 1 < chunk.length; input += 2) {
      left[output] = chunk[input] / 32768;
      right[output] = chunk[input + 1] / 32768;
      output += 1;
    }
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  const started = context.currentTime;
  let stopped = false;
  source.start();
  const done = new Promise((resolve) => { source.onended = resolve; });
  return {
    done,
    durationFrames: frames,
    currentFrame: () => Math.min(frames, Math.max(0, (context.currentTime - started) * 60)),
    stop: async () => {
      if (stopped) return;
      stopped = true;
      try { source.stop(); } catch {}
      try { await context.close(); } catch {}
    }
  };
}
