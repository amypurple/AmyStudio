#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { formatAdamPrinterText } from "../studio/core/romTestRecorderUi.js";

const source = fs.readFileSync("studio/core/romTestRecorderUi.js", "utf8");

assert.match(source, /data-field="voiceModule"/, "debugger is missing the voice-module selector");
assert.match(source, /<option value="lundy" selected>Lundy<\/option>/, "debugger is missing the Lundy profile");
assert.match(source, /<option value="eve">EVE SS-CC<\/option>/, "debugger is missing the EVE profile");
assert.match(source, /<option value="absent">Absent<\/option>/, "debugger is missing the absent profile");
assert.match(source, /core\.setVoiceModuleProfile\(field\("voiceModule"\)\.value\)/,
  "selected external hardware is not applied after ROM reset");
assert.match(source, /field\("voiceModule"\)\.addEventListener\("change"/,
  "changing external hardware does not restart detection");
assert.match(source, /data-field="adamSerial"/, "debugger is missing the ADAM serial selector");
assert.match(source, /data-field="adamSound"/, "debugger is missing the ADAM sound selector");
assert.match(source, /Sound Enhancer/, "debugger is missing the ADAM Sound Enhancer profile");
assert.match(source, /Opcode SGM/, "debugger is missing the Opcode SGM profile");
assert.match(source, /core\.setAdamSoundExpansion\(field\("adamSound"\)\.value\)/,
  "selected ADAM sound expansion is not applied before boot");
assert.match(source, /AdamLink loopback/, "debugger is missing AdamLink loopback mode");
assert.match(source, /Eve\/Orphanware loopback/, "debugger is missing Eve\/Orphanware loopback mode");
assert.match(source, /MicroInnovations loopback/, "debugger is missing MicroInnovations loopback mode");
assert.match(source, /core\.setAdamSerialProfile\(serialProfile\)/,
  "selected ADAM serial interface is not applied before boot");
assert.match(source, /data-tab="adam"/, "debugger is missing the ADAM inspector tab");
assert.match(source, /data-field="adamPrinterOutput"/, "debugger is missing the ADAM printer spool");
assert.match(source, /core\.getAdamNetSummary\(\)/, "debugger does not inspect AdamNet state");
assert.match(source, /core\.clearAdamPrinterData\(\)/, "debugger cannot clear captured printer output");
assert.equal(
  formatAdamPrinterText(Uint8Array.from([0x41, 0x4D, 0x59, 0x0D, 0x0A, 0x09, 0x01])),
  "AMY\n\t\\x01",
  "ADAM printer text decoder mishandles controls"
);

console.log("ROM debugger external-hardware and ADAM UI test passed.");
