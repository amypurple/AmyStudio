#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import {
  buildAdamExpansionDisk,
  buildAdamNativeProgramDisk
} from "../studio/core/adamDiskImage.js";

const uiEventsSource = fs.readFileSync(new URL("../studio/core/uiEvents.js", import.meta.url), "utf8");
assert.match(uiEventsSource, /incrementalCache:\s*adamMediaIncrementalCache/);
assert.match(uiEventsSource, /buildSignature:\s*"adam-native-media-v1"/);
assert.match(uiEventsSource, /buildSignature:\s*"adam-hybrid-media-v1"/);

await verifyNativeProgramCache();
await verifyHybridMediaCache();
console.log("ADAM incremental media build: PASS (native/hybrid loader reuse and clean equivalence)");

async function verifyNativeProgramCache() {
  const cache = new Map();
  let compileCount = 0;
  const assemble = async (...args) => {
    compileCount++;
    return assembleBinary(...args);
  };
  const firstProgram = new Uint8Array(2200).fill(0x11);
  const secondProgram = firstProgram.slice();
  secondProgram[1200] = 0x22;
  const first = await buildAdamNativeProgramDisk({
    program: firstProgram,
    assemble,
    volume: "CACHE TEST",
    incrementalCache: cache,
    buildSignature: "adam-media-v1"
  });
  assert.deepEqual(first.incremental, { rebuiltOutputs: ["LOADER", "BOOT"], reusedOutputs: [] });
  assert.equal(compileCount, 2);
  const second = await buildAdamNativeProgramDisk({
    program: secondProgram,
    assemble,
    volume: "CACHE TEST",
    incrementalCache: cache,
    buildSignature: "adam-media-v1"
  });
  assert.deepEqual(second.incremental, { rebuiltOutputs: [], reusedOutputs: ["LOADER", "BOOT"] });
  assert.equal(compileCount, 2, "same-size native program edit must reuse loader and boot objects");
  assert.notDeepEqual(second.media, first.media, "media must still contain the edited program bytes");
  const clean = await buildAdamNativeProgramDisk({
    program: secondProgram,
    assemble: assembleBinary,
    volume: "CACHE TEST",
    buildSignature: "adam-media-v1"
  });
  assert.deepEqual(second.media, clean.media, "incremental native media must match a clean build");
}

async function verifyHybridMediaCache() {
  const cache = new Map();
  let compileCount = 0;
  const assemble = async (...args) => {
    compileCount++;
    return assembleBinary(...args);
  };
  const common = {
    famous: Uint8Array.of(1, 2, 3),
    capitals: Uint8Array.of(4, 5, 6),
    history: Uint8Array.of(7, 8, 9),
    milestones: Uint8Array.of(10, 11, 12),
    bootSource: "org $C800\ndb {{LOADER_BYTES}}\n",
    loaderSource: "org $2000\nld a,{{ADAM_DEVICE}}\nld b,{{PROGRAM_BLOCKS}}\n{{PAD_PROGRAM_WINDOW}}\nret\n",
    volume: "HYBRID CACHE",
    incrementalCache: cache,
    buildSignature: "adam-media-v1"
  };
  const firstRom = new Uint8Array(32768).fill(0x44);
  const secondRom = firstRom.slice();
  secondRom[0x1234] = 0x55;
  const first = await buildAdamExpansionDisk({ ...common, rom: firstRom, assemble });
  assert.deepEqual(first.incremental, { rebuiltOutputs: ["LOADER", "BOOT"], reusedOutputs: [] });
  const second = await buildAdamExpansionDisk({ ...common, rom: secondRom, assemble });
  assert.deepEqual(second.incremental, { rebuiltOutputs: [], reusedOutputs: ["LOADER", "BOOT"] });
  assert.equal(compileCount, 2, "hybrid game edit must not rebuild unchanged EOS loader objects");
  const clean = await buildAdamExpansionDisk({ ...common, rom: secondRom, assemble: assembleBinary, incrementalCache: null });
  assert.deepEqual(second.media, clean.media, "incremental hybrid media must match a clean build");
}

async function assembleBinary(source, filename) {
  const result = await assembleAmysCVAssembly({ [filename]: source }, filename, {
    outputFilename: filename.replace(/\.asm$/i, ".bin"),
    outputMode: "binary",
    optimize: false
  });
  if (!result.ok) throw new Error(result.log);
  return result.binary || result.bytes;
}
