#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("studio/core/romTestRecorderUi.js", "utf8");

assert.match(source, /data-field="voiceModule"/, "debugger is missing the voice-module selector");
assert.match(source, /<option value="lundy" selected>Lundy<\/option>/, "debugger is missing the Lundy profile");
assert.match(source, /<option value="eve">EVE SS-CC<\/option>/, "debugger is missing the EVE profile");
assert.match(source, /<option value="absent">Absent<\/option>/, "debugger is missing the absent profile");
assert.match(source, /core\.setVoiceModuleProfile\(field\("voiceModule"\)\.value\)/,
  "selected external hardware is not applied after ROM reset");
assert.match(source, /field\("voiceModule"\)\.addEventListener\("change"/,
  "changing external hardware does not restart detection");
assert.match(source, /data-field="machine"/, "debugger is missing the machine selector");
assert.match(source, /<option value="adam-computer">ADAM SmartWriter<\/option>/,
  "debugger is missing ADAM SmartWriter mode");
assert.match(source, /<option value="adam-cartridge">ADAM Cartridge<\/option>/,
  "debugger is missing ADAM cartridge mode");
assert.match(source, /data-field="videoChip"/, "debugger is missing the video-chip selector");
assert.match(source, /core\.loadAdamFirmware\(adamFirmware\)/,
  "stored ADAM firmware is not loaded into GearColeco");
assert.match(source, /core\.startAdam\(\{ cartridge: machine === "adam-cartridge" \}\)/,
  "selected ADAM boot mode is not applied");

console.log("ROM debugger external-hardware UI test passed.");
