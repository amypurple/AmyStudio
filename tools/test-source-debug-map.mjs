import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

const plain = [
  "org $8000",
  "Start:",
  "    ld a,1",
  "    inc a",
  "    ret"
].join("\n");

const marked = [
  "org $8000",
  "Start:",
  "; @amy-source-line 4",
  "    ld a,1",
  "; @amy-source-line 5",
  "    inc a",
  "; @amy-source-line 6",
  "    ret"
].join("\n");

async function assemble(source) {
  return assembleAmysCVAssembly(
    { "main.asm": new TextEncoder().encode(source) },
    "main.asm",
    { optimizerEnabled: false, outputMode: "binary", targetPlatform: "raw" }
  );
}

const plainResult = await assemble(plain);
const markedResult = await assemble(marked);
assert.equal(plainResult.ok, true);
assert.equal(markedResult.ok, true);
assert.deepEqual([...markedResult.binary], [...plainResult.binary], "debug-map side output must not change ROM bytes");
assert.deepEqual(
  markedResult.sourceDebugMap.entries.map((entry) => ({
    sourceLine: entry.sourceLine,
    addresses: entry.addresses,
    optimizedAway: entry.optimizedAway
  })),
  [
    { sourceLine: 4, addresses: [0x8000], optimizedAway: false },
    { sourceLine: 5, addresses: [0x8002], optimizedAway: false },
    { sourceLine: 6, addresses: [0x8003], optimizedAway: false }
  ]
);
assert.match(markedResult.symbolsText, /AMY_SOURCE_LINE_4: equ \$8000/);
assert.match(markedResult.symbolsText, /AMY_SOURCE_LINE_5: equ \$8002/);
assert.match(markedResult.symbolsText, /AMY_SOURCE_LINE_6: equ \$8003/);

const consecutiveMarkers = [
  "org $8000",
  "Start:",
  "; @amy-source-line 10",
  "; @amy-source-line 11",
  "    ld a,1",
  "    ret"
].join("\n");
const consecutiveResult = await assemble(consecutiveMarkers);
assert.equal(consecutiveResult.ok, true);
assert.deepEqual(
  consecutiveResult.sourceDebugMap.entries.map((entry) => ({
    sourceLine: entry.sourceLine,
    addresses: entry.addresses,
    optimizedAway: entry.optimizedAway
  })),
  [
    { sourceLine: 10, addresses: [0x8000], optimizedAway: false },
    { sourceLine: 11, addresses: [0x8000], optimizedAway: false }
  ],
  "consecutive source markers must share the next executable address"
);

const expectedMarkerCount = [...marked.matchAll(/^\s*;\s*@amy-source-line\s+\d+\s*$/gim)].length;

for (const level of ["safe", "balanced", "aggressive", "experimental"]) {
  const profile = getOptimizationProfile(level, plain);
  const options = {
    optimizerEnabled: profile.optimizerEnabled,
    optimizerConfig: profile.optimizerConfig,
    outputMode: "binary",
    targetPlatform: "raw"
  };
  const optimizedPlain = await assembleAmysCVAssembly(
    { "main.asm": new TextEncoder().encode(plain) },
    "main.asm",
    options
  );
  const optimizedMarked = await assembleAmysCVAssembly(
    { "main.asm": new TextEncoder().encode(marked) },
    "main.asm",
    options
  );
  assert.equal(optimizedPlain.ok, true, `${level}: plain source must assemble`);
  assert.equal(optimizedMarked.ok, true, `${level}: marked source must assemble`);
  assert.deepEqual(
    [...optimizedMarked.binary],
    [...optimizedPlain.binary],
    `${level}: source markers must not change optimized ROM bytes`
  );
  assert.equal(optimizedMarked.sourceDebugMap.entries.length, expectedMarkerCount, `${level}: all markers must remain mapped`);
  assert.equal(
    optimizedMarked.sourceDebugMap.entries.filter((entry) => !entry.optimizedAway).length,
    expectedMarkerCount,
    `${level}: all markers must resolve to executable addresses`
  );
}

console.log("zero-byte source debug map: PASS");
