#!/usr/bin/env node
import assert from "node:assert/strict";
import { transpileAmyForTest as transpileAmy } from "./lib/transpile-amy-test.mjs";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { getOptimizationProfile } from "../studio/core/optimization.js";

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
  const helper = `org $8000\n${valid.asmBody.match(/AMY_MEGACART_SELECT_BANK_1:[\s\S]*?ret/)[0]}`;
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
