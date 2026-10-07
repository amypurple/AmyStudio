#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";
import { inferAmyMemoryCapabilities } from "../studio/core/compilerFrontend.js";
import { getRamLayout } from "../studio/ramLayouts.js";
import { renderAlexisRuntime } from "../studio/core/alexisRuntime.js";

const source = `
cartridge "PATTERN CRITICAL/AMY/2026"
reflect pattern 0 to 16 count 1 vertical
reflect pattern 16 to 17 count 1 horizontal
rotate pattern 17 to 18 count 1 90
enlarge pattern 18 to 32 count 1
`;

const result = transpileAmyForTest(source);
assert.equal(result.ok, true, result.log);
const asm = result.asmBody;
assert.match(
  asm,
  /call AMY_REFLECT_PATTERN_HORIZONTAL[\s\S]*call AMY_REFLECT_PATTERN_VERTICAL/,
  "vertical must flip top/bottom and horizontal must flip left/right"
);
const caps = inferAmyMemoryCapabilities(source, () => false);
assert.equal(caps.needsNmi, true, "pattern transforms must reserve NMI runtime state");
assert.ok(getRamLayout("colecovision_legacy_sdcc", caps).userRamStart >= 0x7023,
  "pattern-transform user RAM must follow NMI runtime state");

const runtime = renderAlexisRuntime(asm);
assert.match(runtime, /^AMY_VRAM_BEGIN:/m, "critical-section begin routine must be linked");
assert.match(runtime, /^AMY_VRAM_END:/m, "critical-section end routine must be linked");

for (const routine of [
  "AMY_REFLECT_PATTERN_VERTICAL",
  "AMY_REFLECT_PATTERN_HORIZONTAL",
  "AMY_ROTATE_PATTERN_90",
  "AMY_ENLARGE_PATTERN"
]) {
  const call = `call ${routine}`;
  const callIndex = asm.indexOf(call);
  assert.ok(callIndex >= 0, `${routine} call is missing`);
  assert.ok(asm.lastIndexOf("call AMY_VRAM_BEGIN", callIndex) >= 0,
    `${routine} must disable NMI before touching VRAM`);
  assert.ok(asm.indexOf("call AMY_VRAM_END", callIndex) > callIndex,
    `${routine} must restore the prior NMI state after touching VRAM`);
}

const library = await readFile("src/alexis_lib/coleco_pattern_transform.asm", "utf8");
for (const label of [
  "AMY_REFLECT_PATTERN_VERTICAL",
  "AMY_REFLECT_PATTERN_HORIZONTAL",
  "AMY_ROTATE_PATTERN_90",
  "AMY_ENLARGE_PATTERN"
]) {
  const start = library.indexOf(`${label}:`);
  const end = library.indexOf("\n\n", start);
  const body = library.slice(start, end < 0 ? library.length : end);
  assert.match(body, /push ix[\s\S]*push iy/);
  assert.match(body, /pop iy[\s\S]*pop ix/);
}

console.log("pattern transform VRAM critical-section codegen: PASS");
