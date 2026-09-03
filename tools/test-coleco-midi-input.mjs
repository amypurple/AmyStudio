import assert from "node:assert/strict";
import { connectColecoMidiInput, decodeMidiNoteMessage, midiHoldFrames } from "../studio/core/colecoMidiInput.js";

assert.deepEqual(decodeMidiNoteMessage([0x90, 69, 127]), {
  on: true, noteNumber: 69, note: "A", octave: 4, velocity: 127, volume: 15
});
assert.equal(decodeMidiNoteMessage([0x90, 60, 1]).volume, 1);
assert.equal(decodeMidiNoteMessage([0x90, 60, 0]).on, false);
assert.equal(decodeMidiNoteMessage([0x80, 61, 64]).note, "C#");
assert.equal(decodeMidiNoteMessage([0xB0, 1, 127]), null);
assert.equal(midiHoldFrames(500, "NTSC"), 30);
assert.equal(midiHoldFrames(500, "PAL"), 25);
assert.equal(midiHoldFrames(5000, "NTSC"), 256);
assert.equal(midiHoldFrames(500, "NTSC", 16), 16);
assert.equal(midiHoldFrames(1, "NTSC"), 1);
assert.throws(() => midiHoldFrames(-1), /non-negative/);

const input = new EventTarget();
input.name = "Test Keyboard";
const access = new EventTarget();
access.inputs = new Map([["test", input]]);
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { requestMIDIAccess: async (options) => {
    assert.deepEqual(options, { sysex: false });
    return access;
  } }
});
const received = [];
const connection = await connectColecoMidiInput((message, source) => received.push({ message, source }));
assert.deepEqual(connection.names, ["Test Keyboard"]);
input.dispatchEvent(new MessageEvent("midimessage", { data: new Uint8Array([0x90, 60, 100]) }));
assert.equal(received.length, 1);
assert.equal(received[0].message.note, "C");
assert.equal(received[0].source, input);
connection.disconnect();
input.dispatchEvent(new MessageEvent("midimessage", { data: new Uint8Array([0x90, 62, 100]) }));
assert.equal(received.length, 1);

console.log("Coleco MIDI input tests passed.");
