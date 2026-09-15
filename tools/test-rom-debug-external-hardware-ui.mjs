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

console.log("ROM debugger external-hardware UI test passed.");
