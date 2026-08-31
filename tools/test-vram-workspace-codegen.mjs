#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleVramTextStatement } from "../studio/core/compiler/vramTextStatementHelpers.js";

const loadVram = (expr) => [`    ld de,${expr}`];
const common = { addCompilerWarning: () => {}, normalizeExpression: (value) => String(value).trim(),
  emitLoadVramAddressIntoDE: loadVram, dataLengths: new Map(), precomputedSprite16Lengths: new Map() };
const result = handleVramTextStatement({
  ...common, line: "copy vram.spr_attr + SourceOffset count 19 to vram.name + TargetOffset",
  rawLine: "copy vram.spr_attr + SourceOffset count 19 to vram.name + TargetOffset",
  tryEvaluateConstantExpression: (value) => String(value).trim() === "19" ? 19 : null, assets: []
});
assert.equal(result.ok, true, result.log);
assert.deepEqual(result.lines, [
  "    call AMY_VRAM_BEGIN", "    ld de,vram.spr_attr + SourceOffset", "    ld hl,AMY_BUFFER32",
  "    ld bc,19", "    call READ_VRAM", "    ld de,vram.name + TargetOffset", "    ld hl,AMY_BUFFER32",
  "    ld bc,19", "    call WRITE_VRAM", "    call AMY_VRAM_END"
]);
const decompress = handleVramTextStatement({
  ...common, line: "decompress Level to vram.spr_attr + 128", rawLine: "decompress Level to vram.spr_attr + 128",
  tryEvaluateConstantExpression: () => null, assets: [{ name: "Level", codec: "zx0" }]
});
assert.equal(decompress.ok, true, decompress.log);
assert.match(decompress.lines.join("\n"), /ld de,vram\.spr_attr \+ 128[\s\S]*ld hl,Asset_Level[\s\S]*call zx0_decompress/);
console.log("VRAM workspace codegen: PASS");
