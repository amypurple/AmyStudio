const NOTE_NAMES = Object.freeze(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]);

export function decodeMidiNoteMessage(data) {
  const [status = 0, note = 0, velocity = 0] = data || [];
  const command = status & 0xf0;
  if (command !== 0x80 && command !== 0x90) return null;
  const on = command === 0x90 && velocity > 0;
  return {
    on,
    noteNumber: note,
    note: NOTE_NAMES[note % 12],
    octave: Math.floor(note / 12) - 1,
    velocity,
    volume: on ? Math.max(1, Math.min(15, Math.ceil((velocity / 127) * 15))) : 0
  };
}

export function midiHoldFrames(milliseconds, region = "NTSC", maximum = 256) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new Error("MIDI hold time must be non-negative.");
  const rate = String(region).toUpperCase() === "PAL" ? 50 : 60;
  return Math.max(1, Math.min(maximum, Math.round((milliseconds / 1000) * rate)));
}

export async function connectColecoMidiInput(onNote) {
  if (!navigator.requestMIDIAccess) throw new Error("Web MIDI is unavailable in this browser.");
  const access = await navigator.requestMIDIAccess({ sysex: false });
  const connected = new Set();
  const bindInputs = () => {
    for (const input of access.inputs.values()) {
      if (connected.has(input)) continue;
      input.addEventListener("midimessage", handleMessage);
      connected.add(input);
    }
  };
  const handleMessage = (message) => {
    const note = decodeMidiNoteMessage(message.data);
    if (note) onNote(note, message.currentTarget);
  };
  bindInputs();
  access.addEventListener("statechange", bindInputs);
  return {
    names: [...access.inputs.values()].map((input) => input.name || "MIDI input"),
    disconnect() {
      access.removeEventListener("statechange", bindInputs);
      for (const input of connected) input.removeEventListener("midimessage", handleMessage);
      connected.clear();
    }
  };
}
