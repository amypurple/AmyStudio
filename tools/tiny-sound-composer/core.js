import { decodeColecoSoundStream } from "../../studio/core/colecoSoundNotes.js";

export const INSTRUMENTS = Object.freeze([
  { id: "piano", name: "Piano", icon: "🎹", bytes: [0x30, 0x1a, 0x21], color: "#f2c14e" },
  { id: "trumpet", name: "Trumpet", icon: "🎺", bytes: [0x60, 0x18, 0x32], color: "#f26b38" },
  { id: "bass", name: "Commando Envelope", icon: "🎸", bytes: [0x50, 0x13, 0x33], color: "#4e9f68" },
  { id: "bell", name: "Bell", icon: "🔔", bytes: [0x70, 0xf1, 0x22], color: "#4ca6d8" },
  { id: "organ", name: "Soft Organ", icon: "🎛", bytes: [0x10, 0x1a, 0x21], color: "#a979c9" },
  { id: "pluck", name: "Pluck", icon: "✦", bytes: [0x40, 0xf1, 0x22], color: "#e35d8f" }
]);

const PERIODS = [
  0x03ff,0x03f8,0x03db,0x03bf,0x03a4,0x0389,0x036f,0x0356,0x033e,0x0327,0x0310,0x02f9,
  0x02e3,0x02ce,0x02ba,0x02a6,0x0293,0x0280,0x026e,0x025c,0x024b,0x023a,0x022a,0x021a,
  0x020b,0x01fc,0x01ed,0x01df,0x01d1,0x01c4,0x01b7,0x01ab,0x019f,0x0193,0x0187,0x017c,
  0x0171,0x0167,0x015d,0x0153,0x0149,0x0140,0x0137,0x012e,0x0125,0x011d,0x0115,0x010d,
  0x0105,0x00fe,0x00f6,0x00ef,0x00e8,0x00e2,0x00db,0x00d5,0x00cf,0x00c9,0x00c3,0x00be,
  0x00b8,0x00b3,0x00ae,0x00a9,0x00a4,0x00a0,0x009b,0x0097,0x0092,0x008e,0x008a,0x0086,
  0x0082,0x007f,0x007b,0x0077,0x0074,0x0071,0x006d,0x006a,0x0067,0x0064,0x0061,0x005f,
  0x005c,0x0059,0x0056,0x0054,0x0052,0x0050,0x004d,0x004b,0x0049,0x0047,0x0045,0x0043,
  0x0041,0x003f,0x003d,0x003b,0x0039,0x0038,0x0036,0x0035,0x0033,0x0032,0x0030,0x002f,
  0x002d,0x002c,0x002b,0x002a
];

function pitchName(period) {
  const frequency = 3579545 / (32 * period);
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export function pitchNameForPeriod(period) {
  return pitchName(Math.max(1, Math.min(1023, Number(period) || 1)));
}

export function bassPitchNameForTone3Period(period, lfsr = 15) {
  const divisor = [15, 16].includes(Number(lfsr)) ? Number(lfsr) : 15;
  const tonePeriod = Math.max(1, Math.min(1023, Number(period) || 1));
  const frequency = 3579545 / (32 * tonePeriod * divisor);
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return { name: `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`, frequency };
}

export const PITCHES = Object.freeze(Array.from({ length: 60 }, (_, index) => {
  const code = index + 4;
  const period = notePeriod(code);
  return { name: pitchName(period), code, period };
}).sort((a, b) => a.period - b.period));

export function notePeriod(code) {
  const index = ((((code - 4) & 0x3f) * 2) + 1) % PERIODS.length;
  return PERIODS[index];
}

const OS7_EVENT_CODES = Object.freeze({ note: 0, "frequency-sweep": 1, "volume-sweep": 2, "frequency-volume-sweep": 3 });

function nibbleLength(value) {
  const number = Math.max(1, Math.min(16, Number(value) || 16));
  return number === 16 ? 0 : number;
}

export function encodeEditableOs7Event(event) {
  if (event.type === "rest") return [((event.channel & 3) << 6) | 0x20 | ((event.length === 256 ? 0 : event.length) & 0x1f)];
  if (event.type === "end" || event.type === "repeat") return [((event.channel & 3) << 6) | (event.type === "repeat" ? 0x18 : 0x10)];
  const code = OS7_EVENT_CODES[event.type];
  if (code === undefined) throw new Error(`Unsupported OS7 event ${event.type}.`);
  const channel = event.channel & 3;
  const length = Math.max(1, Math.min(256, Number(event.length) || 1));
  const encodedLength = length === 256 ? 0 : length;
  const attenuation = Math.max(0, Math.min(15, Number(event.attenuation) || 0));
  const bytes = [(channel << 6) | code];
  if (channel === 0) {
    if (code === 0) bytes.push(0);
    bytes.push((attenuation << 4) | (Math.max(0, Math.min(7, Number(event.noise) || 0)) & 7), encodedLength);
  } else {
    const period = Math.max(1, Math.min(1023, Number(event.period) || 1));
    bytes.push(period & 0xff, (attenuation << 4) | ((period >> 8) & 3), encodedLength);
  }
  if (code & 1) {
    const sweep = event.frequencySweep || {};
    bytes.push((nibbleLength(sweep.stepLength) << 4) | nibbleLength(sweep.firstLength), Number(sweep.step || 0) & 0xff);
  }
  if (code & 2) {
    const sweep = event.volumeSweep || {};
    const step = Math.max(0, Math.min(15, Number(sweep.step) || 0));
    bytes.push((step << 4) | nibbleLength(sweep.count), (nibbleLength(sweep.stepLength) << 4) | nibbleLength(sweep.firstLength));
  }
  return bytes;
}

export function encodeEditableOs7Events(events) {
  return [...events].flatMap((event) => encodeEditableOs7Event(event));
}

export function decodeEditableOs7Bytes(bytes) {
  return decodeColecoSoundStream(bytes).events.map((event) => ({ ...event, bytes: [...event.bytes] }));
}

export function createSong(length = 32) {
  return {
    version: 1,
    name: "MyTinySong",
    tempo: 8,
    loop: true,
    length,
    customInstrument: { name: "Custom", bytes: [0x30, 0x18, 0x32], color: "#ef8354" },
    importedInstruments: [],
    companionStreams: null,
    channels: [Array(length).fill(null), Array(length).fill(null)]
  };
}

export function resizeSong(song, length) {
  const size = Math.max(1, Math.min(64, Number(length) || 32));
  song.length = size;
  song.channels = song.channels.map((channel) => Array.from({ length: size }, (_, index) => channel[index] ?? null));
  return song;
}

function instrument(id, song) {
  if (id === "custom" && song?.customInstrument) return { id: "custom", icon: "◆", ...song.customInstrument };
  const imported = song?.importedInstruments?.find((item) => item.id === id);
  if (imported) return imported;
  return INSTRUMENTS.find((item) => item.id === id) || INSTRUMENTS[0];
}

export function compileChannel(channel, options = {}) {
  const { loop = true } = options;
  const bytes = [];
  let activeInstrument = null;
  for (const cell of channel) {
    if (!cell) {
      bytes.push(0x01);
      continue;
    }
    if (cell.hold) {
      bytes.push(0x00);
      continue;
    }
    const nextInstrument = instrument(cell.instrument, options);
    if (activeInstrument !== nextInstrument.id) {
      bytes.push(0x02, ...nextInstrument.bytes);
      activeInstrument = nextInstrument.id;
    }
    bytes.push(cell.code & 0xff);
    if (cell.arpeggioCode !== undefined && cell.arpeggioCode !== null) bytes.push(cell.arpeggioCode & 0xff);
  }
  // Amy's opt-in `play song ... once` interprets the ordinary $FF terminator as stop.
  // Keeping one stream representation preserves the smaller legacy looping runtime.
  bytes.push(0xff);
  return bytes;
}

function hex(value) {
  return `$${value.toString(16).toUpperCase().padStart(2, "0")}`;
}

function dbLines(bytes) {
  const lines = [];
  for (let index = 0; index < bytes.length; index += 16) lines.push(`    db ${bytes.slice(index, index + 16).map(hex).join(",")}`);
  return lines.join("\n");
}

export function buildGearcolecoAuditionAsm(song, { noiseBytes = [0x10], tone3Bytes = [0xd0] } = {}) {
  const ch1 = compileChannel(song.channels[0], song);
  const ch2 = compileChannel(song.channels[1], song);
  return `; GearColeco Tiny Sound audition ROM
ROM_BASE EQU $8000
VDP_CTRL_PORT EQU $BF
PLAY_SOUNDS EQU $1F61
UPDATE_SOUND_ADDR EQU $1FF4
SET_SOUND_TABLE EQU $1FEE
PLAY_SOUND_SLOT EQU $1FF1
TURN_OFF_SOUND EQU $1FD6
MODE_1 EQU $1F85
WRITE_REGISTER EQU $1FD9
AMY_TINYSOUND_SLOT_1 EQU $708A
AMY_TINYSOUND_SLOT_2 EQU $709A
AMY_FRAME_COUNTER EQU $73BA

    org $8000
    db $55,$AA
    dw 0,0,$7000,0,Start
    db $C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0,$C9,0,0
    jp Nmi

Nmi:
    push af
    in a,(VDP_CTRL_PORT)
    push bc
    push de
    push hl
    push ix
    push iy
    ex af,af'
    push af
    exx
    push bc
    push de
    push hl
    pop hl
    pop de
    pop bc
    exx
    pop af
    ex af,af'
    ld hl,AMY_FRAME_COUNTER
    inc (hl)
    jr nz,AuditionFrameReady
    inc hl
    inc (hl)
AuditionFrameReady:
    call PLAY_SOUNDS
    call UPDATE_SOUND_ADDR
    pop iy
    pop ix
    pop hl
    pop de
    pop bc
    pop af
    ret

Start:
    di
    ld sp,$73B7
    xor a
    ld hl,$7000
    ld de,$7001
    ld bc,$03B7
    ld (hl),a
    ldir
    call TURN_OFF_SOUND
    ld hl,PreviewSoundTable
    ld b,8
    call SET_SOUND_TABLE
    ld b,1
    call PLAY_SOUND_SLOT
    ld b,2
    call PLAY_SOUND_SLOT
    ld b,3
    call PLAY_SOUND_SLOT
    ld b,4
    call PLAY_SOUND_SLOT
    call MODE_1
    ld bc,$01E2
    call WRITE_REGISTER
    ei
AuditionLoop:
    halt
    jr AuditionLoop

    include "src/alexis_lib/coleco_tiny_sound.asm"

PreviewNoise:
${dbLines(noiseBytes)}
PreviewTone3:
${dbLines(tone3Bytes)}
PreviewTiny2:
    db $84
    dw sndtiny_2
    db ${song.tempo}
${dbLines(ch2)}
PreviewTiny1:
    db $44
    dw sndtiny_1
    db ${song.tempo}
${dbLines(ch1)}
PreviewSilent:
    db $10
PreviewSoundTable:
    dw PreviewNoise,$702B
    dw PreviewTone3,$7035
    dw PreviewTiny2,$703F
    dw PreviewTiny1,$7049
    dw PreviewSilent,$7053
    dw PreviewSilent,$705D
    dw PreviewSilent,$7067
    dw PreviewSilent,$7071
`;
}

export function sanitizeLabel(value) {
  const label = String(value || "TinySong").replace(/[^A-Za-z0-9_]/g, "_").replace(/^([^A-Za-z_])/, "_$1");
  return label || "TinySong";
}

// readTinySoundLabel stops at the next label. Amy inline-ASM streams may instead
// end at a closing brace, so give importers a harmless sentinel label.
export function prepareTinyImportSource(source) {
  let block = 0;
  const numeric = String(source || "").replace(/(0x[0-9a-f]+|\$[0-9a-f]+|\b\d+)\s*\+\s*(0x[0-9a-f]+|\$[0-9a-f]+|\b\d+)/gi, (_, left, right) => {
    const parse = (value) => /^0x/i.test(value) ? Number.parseInt(value.slice(2), 16) : value.startsWith("$") ? Number.parseInt(value.slice(1), 16) : Number.parseInt(value, 10);
    return `0x${((parse(left) + parse(right)) & 0xff).toString(16).padStart(2, "0")}`;
  });
  const normalized = numeric.replace(/^(\s*)}\s*$/gm, () => `AmyTinyComposerBlockEnd_${block++}:`);
  return `${normalized}\nAmyTinyComposerImportEnd:\n`;
}

function gcd(left, right) {
  let a = Math.max(1, Math.round(left));
  let b = Math.max(1, Math.round(right));
  while (b) [a, b] = [b, a % b];
  return a;
}

export function mixedPreviewCycleFrames(tracks, maxFrames = 8192) {
  const durations = tracks.map((track) => Math.max(1, Math.round(track.durationFrames || 0))).filter(Boolean);
  if (!durations.length) return 1;
  let cycle = durations[0];
  for (const duration of durations.slice(1)) {
    cycle = (cycle / gcd(cycle, duration)) * duration;
    if (cycle > maxFrames) return Math.max(...durations);
  }
  return cycle;
}

export function repeatPreviewTrack(track, targetFrames) {
  const duration = Math.max(1, Math.round(track.durationFrames || 0));
  const repeats = track.loop === false ? 1 : Math.max(1, Math.ceil(targetFrames / duration));
  const output = [];
  for (let repeat = 0; repeat < repeats; repeat += 1) {
    const offset = repeat * duration;
    for (const event of track.events || []) {
      if (offset + (event.startFrame || 0) >= targetFrames) continue;
      output.push({ ...event, startFrame: offset + (event.startFrame || 0) });
    }
  }
  return output;
}

export function exportAsm(song) {
  const label = sanitizeLabel(song.name);
  const ch1 = compileChannel(song.channels[0], song);
  const ch2 = compileChannel(song.channels[1], song);
  const companions = song.companionStreams;
  const companionData = companions ? `${label}_noise:\n${dbLines(companions.noise)}\n\n${label}_tone3:\n${dbLines(companions.tone3)}\n\n` : "";
  const soundTable = companions
    ? `    dw ${label}_noise,$702B\n    dw ${label}_tone3,$7035\n    dw ${label}_ch1,$703F\n    dw ${label}_ch2,$7049`
    : `    dw ${label}_ch1,$702B\n    dw ${label}_ch2,$7035`;
  return `; Tiny Sound Composer export\n; Tempo ${song.tempo} frames per step\n; Amy: play song ${label}_song${song.loop ? "" : " once"}\n${companionData}${label}_ch1:\n    db $44\n    dw sndtiny_1\n    db ${song.tempo}\n${dbLines(ch1)}\n\n${label}_ch2:\n    db $84\n    dw sndtiny_2\n    db ${song.tempo}\n${dbLines(ch2)}\n\n${label}_song:\n    dw $0001\n    db $41,$02\n    dw $0000\n\n${label}_snd_table:\n${soundTable}\n`;
}

export function validateSong(input) {
  if (!input || !Array.isArray(input.channels) || input.channels.length !== 2) throw new Error("This is not a two-channel Tiny Sound project.");
  const song = createSong(input.length);
  song.name = String(input.name || song.name);
  song.tempo = Math.max(2, Math.min(24, Number(input.tempo) || 8));
  song.loop = input.loop !== false;
  if (input.customInstrument && Array.isArray(input.customInstrument.bytes)) {
    song.customInstrument = {
      name: String(input.customInstrument.name || "Custom"),
      color: String(input.customInstrument.color || "#ef8354"),
      bytes: input.customInstrument.bytes.slice(0, 3).map((value) => Math.max(0, Math.min(255, Number(value) || 0)))
    };
  }
  song.importedInstruments = Array.isArray(input.importedInstruments) ? input.importedInstruments.filter((item) => (
    item && typeof item.id === "string" && Array.isArray(item.bytes) && item.bytes.length >= 3
  )).map((item) => ({
    id: item.id,
    name: String(item.name || "Imported"),
    icon: String(item.icon || "◇"),
    color: String(item.color || "#69b3a2"),
    bytes: item.bytes.slice(0, 3).map((value) => Math.max(0, Math.min(255, Number(value) || 0)))
  })) : [];
  if (input.companionStreams && Array.isArray(input.companionStreams.noise) && Array.isArray(input.companionStreams.tone3)) {
    const clean = (bytes) => bytes.map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value <= 255);
    const noise = clean(input.companionStreams.noise);
    const tone3 = clean(input.companionStreams.tone3);
    if (noise.length && tone3.length) song.companionStreams = { noise, tone3 };
  }
  song.channels = input.channels.map((channel) => Array.from({ length: song.length }, (_, index) => {
    const cell = channel?.[index];
    if (!cell) return null;
    const code = Number(cell.code);
    const plainCode = (((code - 4) & 0x3f) + 4);
    if (!Number.isInteger(code) || plainCode < 4 || plainCode > 0x3f) return null;
    const arpeggioCode = cell.arpeggioCode === undefined || cell.arpeggioCode === null ? null : Number(cell.arpeggioCode);
    return {
      code,
      instrument: cell.instrument === "custom" ? "custom" : instrument(cell.instrument, song).id,
      hold: cell.hold === true,
      ...(Number.isInteger(arpeggioCode) ? { arpeggioCode } : {})
    };
  }));
  return song;
}
