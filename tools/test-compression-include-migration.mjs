#!/usr/bin/env node
import assert from "node:assert/strict";
import { normalizeCompressionInclude, normalizeCompressionIncludes } from "../studio/core/compressionIncludes.js";
import { importProjectObject } from "../studio/core/projectPersistence.js";
import { generateAsm } from "../studio/core/project.js";
import { compileGeneratedAsm } from "../studio/core/internalCompiler.js";

assert.equal(normalizeCompressionInclude("zx0"), "src/compression/zx0_vram.asm");
assert.equal(normalizeCompressionInclude("ZX0"), "src/compression/zx0_vram.asm");
assert.equal(normalizeCompressionInclude("bitbuster12"), "src/compression/bitbuster_vram.asm");
assert.equal(normalizeCompressionInclude("src\\compression\\zx7_vram.asm"), "src/compression/zx7_vram.asm");
assert.equal(normalizeCompressionInclude("custom/decompressor.asm"), "custom/decompressor.asm");
assert.deepEqual(
  normalizeCompressionIncludes(["zx0", "src/compression/zx0_vram.asm", "zx7"]),
  ["src/compression/zx0_vram.asm", "src/compression/zx7_vram.asm"]
);

const imported = importProjectObject({ selectedCompression: ["zx0"] }, {
  newProject: () => ({ selectedCompression: [] }),
  normalizeProjectFiles: (files) => files,
  normalizeOptimizationLevel: (level) => level
});
assert.deepEqual(imported.selectedCompression, ["src/compression/zx0_vram.asm"]);

const asm = generateAsm({
  projectName: "Legacy codec id",
  memoryProfile: "colecovision_legacy_sdcc",
  sourceText: "",
  selectedLibs: [],
  selectedBundles: [],
  selectedCompression: ["zx0"],
  selectedAssets: [],
  projectFiles: []
}, "Start:\n    jp Start");
assert.match(asm, /^include "src\/compression\/zx0_vram\.asm"$/m);
assert.doesNotMatch(asm, /^include "zx0"$/m);
const compiled = await compileGeneratedAsm(asm);
assert.equal(compiled.ok, true, compiled.log || "Legacy codec-id project did not assemble");

console.log("Compression include migration: PASS");
