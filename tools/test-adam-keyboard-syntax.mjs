#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleAdamStatement } from "../studio/core/compiler/adamStatementHelpers.js";

let label = 0;
const compile = (line, platform = "adam-native-program") => handleAdamStatement({
  line,
  rawLine: line,
  buildContext: {
    platform,
    medium: "dsk",
    capabilities: platform === "adam-native-program" ? ["adam", "eos", "adam-keyboard"] : ["os7"]
  },
  emitLoadInt16IntoHL: () => null,
  emitLoadInt8TermIntoA: (value) => [`    ld a,(${value})`],
  emitLoadSourceAddressIntoHL: () => null,
  emitStoreInt8FromA: (target) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(target) ? [`    ld (${target}),a`] : null,
  makeGeneratedLabel: (prefix) => `${prefix}_${label++}`
});

const shortForm = compile("KeyCode = await key");
assert.equal(shortForm.ok, true);
assert.match(shortForm.lines.join("\n"), /call \$FC6C[\s\S]*ld \(KeyCode\),a/i);
assert.doesNotMatch(shortForm.lines.join("\n"), /KeyStatus/i);

const statusForm = compile("KeyCode = await key status KeyStatus");
assert.equal(statusForm.ok, true);
assert.match(statusForm.lines.join("\n"), /ld \(KeyStatus\),a/i);

const asyncStart = compile("KeyRequest = key start");
assert.equal(asyncStart.ok, true);
assert.match(asyncStart.lines.join("\n"), /call \$FCA8[\s\S]*ld \(KeyRequest\),a/i);

const asyncPoll = compile("KeyCode = key poll KeyRequest status KeyStatus");
assert.equal(asyncPoll.ok, true);
assert.match(asyncPoll.lines.join("\n"), /call \$FC4B/i);

const reset = compile("key reset");
assert.equal(reset.ok, true);
assert.match(reset.lines.join("\n"), /call \$FC93/i);

const rejected = compile("KeyCode = await key", "colecovision-cartridge");
assert.equal(rejected.ok, false);
assert.match(rejected.log, /EOS-capable ADAM target/i);

for (const removed of [
  "await key into KeyCode",
  "get key into KeyCode",
  "adam read key into KeyCode",
  "key start into KeyRequest",
  "key poll KeyRequest into KeyCode status KeyStatus",
  "adam reset keyboard"
]) {
  assert.equal(compile(removed).handled, false, removed);
}

console.log("ADAM keyboard syntax: PASS (modern blocking/async forms, removed aliases, OS7 rejection)");
