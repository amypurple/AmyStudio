#!/usr/bin/env node
import assert from "node:assert/strict";
import { transpileAmyForTest as transpileAmy } from "./lib/transpile-amy-test.mjs";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";
import { generateAsm } from "../studio/core/project.js";

const valid = transpileAmy([
  "bank rom 128",
  "sub start:",
  "  bank select 1",
  "  bank select 2",
  "end sub"
].join("\n"));
assert.equal(valid.ok, true, valid.log);
assert.match(valid.asmBody, /call AMY_MEGACART_SELECT_BANK_1/);
assert.match(valid.asmBody, /ld a,\(\$FFC0\)/);
assert.match(valid.asmBody, /ld a,\(\$FFC1\)/);
assert.equal(valid.metadata.megaCart.romSizeKb, 128);
assert.deepEqual(valid.metadata.megaCart.selectedLogicalBanks, [1, 2]);

const compact64 = transpileAmy("bank rom 64\nbank select 3");
assert.equal(compact64.ok, true, compact64.log);
assert.equal(compact64.metadata.megaCart.romSizeKb, 64);

const missingDeclaration = transpileAmy("bank select 1");
assert.equal(missingDeclaration.ok, false);
assert.match(missingDeclaration.log, /requires BANK ROM/i);

const outOfRange = transpileAmy("bank rom 128\nbank select 8");
assert.equal(outOfRange.ok, false);
assert.match(outOfRange.log, /1-7/);

const duplicate = transpileAmy("bank rom 128\nbank rom 256");
assert.equal(duplicate.ok, false);
assert.match(duplicate.log, /only once/i);

const section = transpileAmy("bank rom 128\nbank 1");
assert.equal(section.ok, false);
assert.match(section.log, /bank-output boundary/i);

const bankCall = transpileAmy("bank rom 128\ncall bank 2, DrawLevel");
assert.equal(bankCall.ok, true, bankCall.log);
assert.match(bankCall.asmBody, /call AMY_MEGACART_CALL_BANK_2_DrawLevel/);
assert.match(bankCall.asmBody, /AMY_MEGACART_CURRENT_BANK EQU \$[0-9A-F]{4}/);
assert.deepEqual(bankCall.metadata.megaCart.imports, [{
  bank: 2, name: "DrawLevel", kind: "procedure", trampolineLabel: "AMY_MEGACART_CALL_BANK_2_DrawLevel"
}]);

const bankDecompress = transpileAmy("bank rom 128\ndecompress zx0 LevelPicture from bank 3 to vram.pattern + 32");
assert.equal(bankDecompress.ok, true, bankDecompress.log);
assert.match(bankDecompress.asmBody, /ld de,VRAM_PATTERN \+ 32/);
assert.match(bankDecompress.asmBody, /call AMY_MEGACART_DECOMPRESS_ZX0_BANK_3_LevelPicture/);
assert.deepEqual(bankDecompress.metadata.megaCart.imports, [{
  bank: 3, name: "LevelPicture", kind: "data", operation: "decompress-vram", codec: "zx0",
  trampolineLabel: "AMY_MEGACART_DECOMPRESS_ZX0_BANK_3_LevelPicture"
}]);

const missingDecompressDeclaration = transpileAmy("decompress zx0 LevelPicture from bank 3 to vram.pattern");
assert.equal(missingDecompressDeclaration.ok, false);
assert.match(missingDecompressDeclaration.log, /requires BANK ROM/i);

const outOfRangeDecompress = transpileAmy("bank rom 64\ndecompress zx0 LevelPicture from bank 4 to vram.pattern");
assert.equal(outOfRangeDecompress.ok, false);
assert.match(outOfRangeDecompress.log, /bank 1-3/i);

const bankDecompressAsm = generateAsm({
  sourceText: "bank rom 128\ndecompress zx0 LevelPicture from bank 3 to vram.pattern",
  projectName: "MegaCart banked compression selftest",
  memoryProfile: "colecovision_legacy_sdcc",
  selectedLibs: [], selectedBundles: [], selectedCompression: [], selectedAssets: [], projectFiles: []
}, bankDecompress.asmBody, [], bankDecompress.metadata);
assert.match(bankDecompressAsm, /include "src\/compression\/zx0_vram\.asm"/);

const bankCopy = transpileAmy("bank rom 128\ncopy LevelMap from bank 2 count 768 to vram.name + 32");
assert.equal(bankCopy.ok, true, bankCopy.log);
assert.match(bankCopy.asmBody, /ld de,VRAM_NAME \+ 32/);
assert.match(bankCopy.asmBody, /ld bc,768/);
assert.match(bankCopy.asmBody, /call AMY_MEGACART_COPY_BANK_2_LevelMap_TO_VRAM/);
assert.deepEqual(bankCopy.metadata.megaCart.imports, [{
  bank: 2, name: "LevelMap", kind: "data", operation: "copy-vram",
  trampolineLabel: "AMY_MEGACART_COPY_BANK_2_LevelMap_TO_VRAM"
}]);
const bankCopyAsm = generateAsm({
  sourceText: "bank rom 128\ncopy LevelMap from bank 2 count 768 to vram.name",
  projectName: "MegaCart banked copy selftest", memoryProfile: "colecovision_legacy_sdcc",
  selectedLibs: [], selectedBundles: [], selectedCompression: [], selectedAssets: [], projectFiles: []
}, bankCopy.asmBody, [], bankCopy.metadata);
assert.match(bankCopyAsm, /AMY_COPY_BYTES_TO_VRAM:/);

const missingCopyDeclaration = transpileAmy("copy LevelMap from bank 2 count 32 to vram.name");
assert.equal(missingCopyDeclaration.ok, false);
assert.match(missingCopyDeclaration.log, /requires BANK ROM/i);
const outOfRangeCopy = transpileAmy("bank rom 64\ncopy LevelMap from bank 4 count 32 to vram.name");
assert.equal(outOfRangeCopy.ok, false);
assert.match(outOfRangeCopy.log, /bank 1-3/i);

const missingCallDeclaration = transpileAmy("call bank 2, DrawLevel");
assert.equal(missingCallDeclaration.ok, false);
assert.match(missingCallDeclaration.log, /requires BANK ROM/i);

const bankContext = {
  buildContext: {
    platform: "colecovision-megacart-bank",
    memoryProfile: "colecovision_legacy_sdcc",
    capabilities: ["os7", "megacart", "bank-local"],
    bank: 2
  }
};
const bankModule = transpileAmy("sub DecodeBankData:\n  return\nend sub\ndata Caption bytes = 65,66,67", bankContext);
assert.equal(bankModule.ok, true, bankModule.log);
assert.doesNotMatch(bankModule.asmBody, /(^|\n)Start:/);
assert.match(bankModule.asmBody, /AMY_UPROC_DecodeBankData:/);
assert.match(bankModule.asmBody, /AMY_UDATA_Caption:/);

const bankMain = transpileAmy("u8 RuntimeValue = 7", bankContext);
assert.equal(bankMain.ok, false);
assert.match(bankMain.log, /not top-level executable statements or global runtime initialization/i);

for (const level of ["safe", "balanced", "aggressive", "experimental"]) {
  const helper = `AMY_MEGACART_CURRENT_BANK equ $7000\norg $8000\n${valid.asmBody.match(/AMY_MEGACART_SELECT_BANK_1:[\s\S]*?ret/)[0]}`;
  const profile = getOptimizationProfile(level, helper);
  const assembled = await assembleAmysCVAssembly({ "main.asm": helper }, "main.asm", {
    outputFilename: `megacart-select-${level}.bin`, outputMode: "binary", targetPlatform: "raw",
    optimizerEnabled: profile.optimizerEnabled, optimizerConfig: profile.optimizerConfig
  });
  assert.equal(assembled.ok, true, assembled.log);
  const bytes = [...assembled.binary];
  assert.ok(bytes.some((byte, index) => byte === 0x3A && bytes[index + 1] === 0xC0 && bytes[index + 2] === 0xFF),
    `${level} optimizer removed the side-effecting MegaCart mapper read`);
}
console.log("Amy MegaCart syntax: PASS");
