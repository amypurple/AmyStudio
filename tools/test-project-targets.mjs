#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  AMY_MEMORY_MAPS,
  decodeAdamMioc,
  estimateTargetCapacity,
  getTargetOptimizationPolicy,
  getBuildContextDefines,
  resolveAmyBuildContext,
  targetHasCapability,
  validateAmyBuildProject
} from "../studio/core/projectTargets.js";
import { exportProject, importProjectObject } from "../studio/core/projectPersistence.js";
import { transpileAmySource } from "../studio/core/amyCompiler.js";

const adam = JSON.parse(fs.readFileSync(new URL("../studio/examples-src/adam-multi-output-prototype.amy.json", import.meta.url)));
const result = validateAmyBuildProject(adam);
assert.equal(result.ok, true, result.errors.join("\n"));
assert.equal(targetHasCapability("adam-disk", "multiple-outputs"), true);
assert.equal(targetHasCapability("adam-disk", "cartridge"), false);
assert.equal(targetHasCapability("colecovision-megacart", "megacart"), true);
assert.equal(getTargetOptimizationPolicy("colecovision-cartridge").cartridgeRstVectors, true);
assert.equal(getTargetOptimizationPolicy("adam-native-program").cartridgeRstVectors, false);
assert.equal(getTargetOptimizationPolicy("adam-disk").packageAdamMedia, true);
assert.equal(getTargetOptimizationPolicy("colecovision-megacart").requireBankAwareSymbols, true);
assert.equal(estimateTargetCapacity("adam-disk", { blockCount: 160 }), 160 * 1024);
assert.equal(estimateTargetCapacity("colecovision-megacart", { romSizeKb: 512 }), 512 * 1024);

const legacyContext = resolveAmyBuildContext({ memoryProfile: "colecovision_legacy_sdcc" });
assert.equal(legacyContext.platform, "colecovision-cartridge");
assert.equal(legacyContext.machine, "colecovision");
assert.equal(legacyContext.optimizationPolicy.cartridgeRstVectors, true);
const nativeContext = resolveAmyBuildContext(
  { target: { platform: "colecovision-cartridge" }, memoryProfile: "colecovision_legacy_sdcc" },
  { target: { platform: "adam-native-program" }, memoryProfile: "adam-eos-application" }
);
assert.equal(nativeContext.platform, "adam-native-program");
assert.equal(nativeContext.machine, "adam");
assert.equal(nativeContext.memoryMap.programStart, 0x0100);
assert.equal(nativeContext.optimizationPolicy.cartridgeRstVectors, false);
assert.equal(nativeContext.medium, "dsk");
assert.equal(resolveAmyBuildContext({ target: { platform: "adam-native-program", medium: "ddp" } }).medium, "ddp");
assert.equal(resolveAmyBuildContext({ target: { platform: "adam-native-program", medium: "data-pack" } }).medium, "ddp");
assert.equal(legacyContext.medium, null);
assert.deepEqual(getBuildContextDefines(nativeContext), ["AMY_TARGET_ADAM", "AMY_HAS_EOS", "AMY_HAS_ADAMNET", "AMY_HAS_FILE_IO"]);
assert.deepEqual(getBuildContextDefines(legacyContext), ["AMY_TARGET_COLECOVISION", "AMY_HAS_OS7"]);
const sgmContext = resolveAmyBuildContext({
  target: { platform: "colecovision-cartridge", hardware: ["sgm1"] },
  memoryProfile: "colecovision_legacy_sdcc"
});
assert.ok(sgmContext.capabilities.includes("sgm-ay"));
assert.ok(sgmContext.capabilities.includes("sgm-ram-upper"));
assert.ok(sgmContext.capabilities.includes("sgm-ram-lower"));
assert.deepEqual(getBuildContextDefines(sgmContext), ["AMY_TARGET_COLECOVISION", "AMY_HAS_OS7", "AMY_HAS_SGM", "AMY_HAS_SGM_AY"]);
const adamSoundEnhancerContext = resolveAmyBuildContext({
  target: { platform: "adam-native-program", medium: "dsk", hardware: ["adam-sound-enhancer"] },
  memoryProfile: "adam-eos-application"
});
assert.ok(adamSoundEnhancerContext.capabilities.includes("sgm-ay"));
assert.ok(!adamSoundEnhancerContext.capabilities.includes("sgm"));
assert.ok(!adamSoundEnhancerContext.capabilities.includes("sgm-ram-upper"));
assert.ok(!adamSoundEnhancerContext.capabilities.includes("sgm-ram-lower"));
assert.deepEqual(getBuildContextDefines(adamSoundEnhancerContext), ["AMY_TARGET_ADAM", "AMY_HAS_EOS", "AMY_HAS_ADAMNET", "AMY_HAS_FILE_IO", "AMY_HAS_SGM_AY"]);
for (const [hardware, backend] of [
  ["adamlink", "serial-adamlink"],
  ["eve-serial", "serial-eve"],
  ["micro-serial", "serial-micro"]
]) {
  const serialContext = resolveAmyBuildContext({
    target: { platform: "adam-native-program", medium: "dsk", hardware: [hardware] },
    memoryProfile: "adam-eos-application"
  });
  assert.ok(serialContext.capabilities.includes("serial"));
  assert.ok(serialContext.capabilities.includes(backend));
  assert.ok(getBuildContextDefines(serialContext).includes("AMY_HAS_SERIAL"));
}
const hybridContext = resolveAmyBuildContext({
  target: { platform: "adam-disk", medium: "dsk" },
  memoryProfile: "adam-os7-eos-drivers"
});
assert.equal(hybridContext.medium, "dsk");
assert.ok(hybridContext.capabilities.includes("os7"));
assert.ok(hybridContext.capabilities.includes("eos"));
assert.ok(hybridContext.capabilities.includes("file-io"));
assert.deepEqual(getBuildContextDefines(hybridContext), ["AMY_TARGET_ADAM", "AMY_HAS_OS7", "AMY_HAS_EOS", "AMY_HAS_ADAMNET", "AMY_HAS_FILE_IO"]);
const hybridDataPackContext = resolveAmyBuildContext({
  target: { platform: "adam-data-pack", medium: "ddp" },
  memoryProfile: "adam-os7-eos-drivers"
});
assert.equal(hybridDataPackContext.medium, "ddp");
const eosDiskProgram = resolveAmyBuildContext({
  target: { platform: "adam-disk" },
  memoryProfile: "adam-eos-application"
});
assert.equal(eosDiskProgram.medium, "dsk");
assert.ok(eosDiskProgram.capabilities.includes("eos"));
assert.ok(!eosDiskProgram.capabilities.includes("os7"));
assert.deepEqual(getBuildContextDefines(eosDiskProgram), ["AMY_TARGET_ADAM", "AMY_HAS_EOS", "AMY_HAS_ADAMNET", "AMY_HAS_FILE_IO"]);
const eosBootBlock = resolveAmyBuildContext({
  target: { platform: "adam-data-pack" },
  memoryProfile: "adam-eos-boot-block"
});
assert.equal(eosBootBlock.medium, "ddp");
assert.ok(eosBootBlock.capabilities.includes("eos"));
assert.ok(!eosBootBlock.capabilities.includes("os7"));
const compatibilityContext = resolveAmyBuildContext({
  target: { platform: "adam-disk", medium: "dsk" },
  memoryProfile: "colecovision_legacy_sdcc"
});
assert.ok(compatibilityContext.capabilities.includes("os7"));
assert.ok(!compatibilityContext.capabilities.includes("eos"));
assert.deepEqual(getBuildContextDefines(compatibilityContext), ["AMY_TARGET_ADAM", "AMY_HAS_OS7"]);
assert.match(nativeContext.warnings.join("\n"), /overridden by manifest target/);
assert.throws(() => resolveAmyBuildContext({}, { target: { platform: "unknown-machine" } }), /Unknown Amy build target/);
let forwardedOptions = null;
const forwarded = transpileAmySource({
  sourceLang: "amy",
  sourceText: "text screen",
  options: { buildContext: nativeContext },
  transpileAmy: (source, options) => {
    forwardedOptions = options;
    return { ok: true, asmBody: source, metadata: {} };
  }
});
assert.equal(forwarded.ok, true);
assert.equal(forwardedOptions.buildContext.platform, "adam-native-program");

const eos = AMY_MEMORY_MAPS["adam-eos-application"];
assert.equal(eos.programStart, 0x0100);
assert.equal(eos.programEndExclusive, 0xD390);
assert.ok(eos.regions.every((region, index, regions) => index === 0 || regions[index - 1].endExclusive <= region.start));
assert.equal(eos.regions.at(-1).initializedFrom, "eos-rom");
assert.equal(eos.regions.at(-1).access, "ram");

const firmwareBootMap = decodeAdamMioc(0x00, { eosSelected: true });
assert.equal(firmwareBootMap.regions[1].source, "eos-rom");
assert.equal(firmwareBootMap.regions[2].source, "main-ram");
const allMainRamMap = decodeAdamMioc(0x01);
assert.deepEqual(allMainRamMap.regions.map((region) => region.source), ["main-ram", "main-ram"]);
assert.ok(allMainRamMap.regions.every((region) => region.writable));
const expansionMap = decodeAdamMioc(0x0A);
assert.deepEqual(expansionMap.regions.map((region) => region.source), ["expansion-ram", "expansion-ram"]);
assert.equal(decodeAdamMioc(0x04).upper[0].source, "expansion-rom");
assert.equal(decodeAdamMioc(0x04).upper[0].emulatorFallback, "open-bus");
const cartridgeMap = decodeAdamMioc(0x0F);
assert.deepEqual(cartridgeMap.regions.map((region) => region.source), ["os7-rom", "main-ram", "cartridge"]);

const badMegaCart = validateAmyBuildProject({
  target: { platform: "colecovision-megacart", romSizeKb: 96 },
  outputs: [{ name: "GAME", type: "program", sources: ["main.amy"] }]
});
assert.equal(badMegaCart.ok, false);
assert.match(badMegaCart.errors.join("\n"), /64, 128, 256, 512, or 1024/);

const badAdam = validateAmyBuildProject({
  target: { platform: "adam-disk" },
  outputs: [{ name: "GAME", type: "program", sources: ["main.amy"] }]
});
assert.equal(badAdam.ok, false);
assert.match(badAdam.errors.join("\n"), /requires one boot output/);

const persistenceOptions = {
  normalizeProjectFiles: (files) => files,
  normalizeOptimizationLevel: (level) => level
};
const imported = importProjectObject(adam, {
  ...persistenceOptions,
  newProject: () => ({
    version: 2,
    projectName: "Untitled",
    sourceLang: "amy",
    projectFiles: [],
    sourceBreakpoints: [],
    sourceText: ""
  })
});
const exported = exportProject(imported, persistenceOptions);
assert.deepEqual(exported.target, adam.target);
assert.deepEqual(exported.outputs, adam.outputs);
exported.outputs[0].name = "CHANGED";
assert.equal(imported.outputs[0].name, "BOOT", "export must not alias live project output metadata");

console.log("Amy project targets: PASS");
