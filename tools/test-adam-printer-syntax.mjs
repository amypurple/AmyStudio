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
    capabilities: platform === "adam-native-program" ? ["adam", "eos", "printer"] : ["os7"]
  },
  emitLoadInt16IntoHL: () => null,
  emitLoadInt8TermIntoA: (value) => [`    ld a,(${value})`],
  emitLoadSourceAddressIntoHL: () => null,
  emitStoreInt8FromA: (target) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(target) ? [`    ld (${target}),a`] : null,
  makeGeneratedLabel: (prefix) => `${prefix}_${label++}`
});

const text = compile('print "AMY" to printer status PrintStatus');
assert.equal(text.ok, true);
assert.equal((text.lines.join("\n").match(/call \$FC63/gi) || []).length, 1);
assert.equal((text.lines.join("\n").match(/call \$FC66/gi) || []).length, 0);
assert.match(text.lines.join("\n"), /db \$41,\$4d,\$59,\$03/i);
assert.match(text.lines.join("\n"), /ld \(PrintStatus\),a/i);

const byte = compile("print Character to printer");
assert.equal(byte.ok, true);
assert.match(byte.lines.join("\n"), /ld a,\(Character\)[\s\S]*call \$FC66/i);

const rejected = compile('print "AMY" to printer', "colecovision-cartridge");
assert.equal(rejected.ok, false);
assert.match(rejected.log, /EOS-capable ADAM target/i);

console.log("ADAM printer syntax: PASS (ETX text, byte, optional status, OS7 rejection)");
