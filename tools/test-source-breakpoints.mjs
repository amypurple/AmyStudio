import assert from "node:assert/strict";
import fs from "node:fs";
import {
  breakpointEligibleLineNumbers,
  instrumentAmySourceWithBreakpoints,
  instrumentAmySourceWithSourceMarkers,
  stripGeneratedSourceMarkers,
  isBreakpointEligibleLine,
  normalizeSourceBreakpoints,
  remapSourceBreakpoints
} from "../studio/core/editor/sourceBreakpoints.js";
import {
  evaluateBreakpointCondition,
  parseBreakpointCondition
} from "../studio/core/breakpointConditions.js";

const source = [
  'project "Breakpoint Lab"',
  "u8 Score = 0",
  "i8 Velocity = 0",
  "sub start:",
  "  Score += 1",
  "  goto start",
  "end sub"
].join("\n");

const breakpoints = normalizeSourceBreakpoints([
  { id: "bp_1", line: 4 },
  { id: "bp_2", line: 5, condition: "Score >= 10", valueType: "auto" }
]);
const sourceMarked = instrumentAmySourceWithSourceMarkers(source);
assert.match(sourceMarked, /sub start:\n\s*debug source marker 4/);
assert.match(sourceMarked, /debug source marker 5\n\s*Score \+= 1/);
assert.equal(sourceMarked.includes("debug source marker 2"), false, "global declarations are not executable");
assert.equal(
  stripGeneratedSourceMarkers("ld a,1\n; @amy-source-line 5\ninc a"),
  "ld a,1\ninc a"
);
const instrumented = instrumentAmySourceWithBreakpoints(source, breakpoints);
assert.match(instrumented, /sub start:\n\s*debug breakpoint "ui_bp_1"/);
assert.match(instrumented, /debug breakpoint "ui_bp_2"\n\s*Score \+= 1/);
assert.equal(instrumented.includes('debug breakpoint "ui_bp_1"\nsub start:'), false);
assert.equal(isBreakpointEligibleLine("u8 Score = 0"), false);
assert.equal(isBreakpointEligibleLine("  Score += 1"), true);
assert.equal(isBreakpointEligibleLine("else"), false);
assert.equal(isBreakpointEligibleLine("end if"), false);
assert.equal(isBreakpointEligibleLine("elseif Score = 1 then"), true);

const structuredSource = [
  "record Actor",
  "  u8 X",
  "end record",
  "enum Direction",
  "  Left = -1",
  "end enum",
  "sub Move:",
  "  ActorX += 1",
  "end sub"
].join("\n");
assert.deepEqual(
  [...breakpointEligibleLineNumbers(structuredSource)],
  [7, 8],
  "record and enum members must not accept executable breakpoints"
);

const shifted = remapSourceBreakpoints(source, source.replace("sub start:", "' inserted\nsub start:"), breakpoints);
assert.deepEqual(shifted.map((entry) => entry.line), [5, 6]);
const edited = remapSourceBreakpoints(source, source.replace("Score += 1", "Score += 2"), breakpoints);
assert.deepEqual(edited.map((entry) => entry.line), [4, 5]);

const symbols = [
  { name: "AMY_UVAR_Score", address: 0x7120 },
  { name: "AMY_UVAR_Velocity", address: 0x7121 }
];
const memory = new Uint8Array(0x10000);
memory[0x7120] = 12;
memory[0x7121] = 0xFF;
const readMemory = (address, size) => memory.slice(address, address + size);
assert.deepEqual(parseBreakpointCondition("Score >= 10"), { operand: "Score", operator: ">=", expected: 10 });
assert.equal(evaluateBreakpointCondition({ condition: "Score >= 10", symbols, sourceText: source, readMemory }).matched, true);
assert.equal(evaluateBreakpointCondition({ condition: "Score > 12", symbols, sourceText: source, readMemory }).matched, false);
assert.equal(evaluateBreakpointCondition({ condition: "Velocity < 0", symbols, sourceText: source, readMemory }).matched, true);
memory[0x7122] = 0x2C;
memory[0x7123] = 0x01;
assert.equal(evaluateBreakpointCondition({ condition: "$7122 >= 300", valueType: "u16", symbols, sourceText: source, readMemory }).matched, true);
assert.throws(() => parseBreakpointCondition("Score plus 1"), /Use Score/);

const studioHtml = fs.readFileSync(new URL("../studio/index.html", import.meta.url), "utf8");
const studioCss = fs.readFileSync(new URL("../studio/styles.css", import.meta.url), "utf8");
assert.match(studioHtml, /<textarea id="sourceEditor"[^>]*\bwrap="off"/i, "source line gutter requires wrapping to be disabled");
assert.match(studioCss, /#sourceEditor\s*\{[^}]*white-space:\s*pre;/s, "source editor CSS must preserve one visual row per source line");

console.log("source breakpoint model: PASS");
