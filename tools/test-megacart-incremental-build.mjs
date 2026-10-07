#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { buildMegaCartProject } from "../studio/core/megaCartProjectBuild.js";

const encoder = new TextEncoder();
const cache = new Map();
const uiEventsSource = fs.readFileSync(new URL("../studio/core/uiEvents.js", import.meta.url), "utf8");
const bindEventsSource = fs.readFileSync(new URL("../studio/core/bindStudioEvents.js", import.meta.url), "utf8");
assert.match(uiEventsSource, /export function bindStudioRuntimeEvents[\s\S]*?const\s*\{[\s\S]*?renderProjectFiles,/);
assert.match(bindEventsSource, /bindStudioRuntimeEvents\(\{[\s\S]*?renderProjectFiles:\s*helpers\.renderProjectFiles,/);
const manifest = {
  target: { platform: "colecovision-megacart", romSizeKb: 128 },
  outputs: [
    { name: "FIXED", type: "fixed-bank", sources: [] },
    { name: "BANK1", type: "switchable-bank", bank: 1, sources: [{ path: "bank1.asm", kind: "asm" }] },
    { name: "BANK2", type: "switchable-bank", bank: 2, sources: [{ path: "bank2.asm", kind: "asm" }] }
  ]
};
let project = projectWith("db $11", "db $22");
let asmCompiles = 0;
let fixedCompiles = 0;

const first = await build(project);
assert.deepEqual(first.incremental.rebuiltOutputs, ["FIXED", "BANK1", "BANK2"]);
assert.deepEqual(first.incremental.reusedOutputs, []);
assert.deepEqual(Object.keys(first.incremental.outputFingerprints), ["BANK1", "BANK2"]);
assert.equal(asmCompiles, 2);
assert.equal(fixedCompiles, 1);

const second = await build(project);
assert.deepEqual(second.incremental.rebuiltOutputs, ["FIXED"]);
assert.deepEqual(second.incremental.reusedOutputs, ["BANK1", "BANK2"]);
assert.equal(asmCompiles, 2, "unchanged switchable outputs must not be reassembled");
assert.equal(fixedCompiles, 2, "the fixed bank remains conservatively relinked");
assert.deepEqual(second.image, first.image, "incremental and clean-equivalent images must be byte-identical");

project = projectWith("db $33", "db $22");
const third = await build(project);
assert.deepEqual(third.incremental.rebuiltOutputs, ["FIXED", "BANK1"]);
assert.deepEqual(third.incremental.reusedOutputs, ["BANK2"]);
assert.equal(asmCompiles, 3, "only the edited independent bank must be reassembled");
assert.equal(fixedCompiles, 3);
assert.equal(third.image[0], 0x33);
assert.equal(third.image[0x4000], 0x22);

const clean = await buildMegaCartProject({
  project,
  manifest,
  fixedBank: null,
  compileAsm: assemble,
  compileFixed: fixedBank,
  buildSignature: "test-v1"
});
assert.deepEqual(third.image, clean.image, "incremental and explicit clean builds must be byte-identical");

console.log("MegaCart incremental build: PASS (unchanged bank reuse, edited-bank rebuild, clean equivalence)");

async function build(currentProject) {
  return buildMegaCartProject({
    project: currentProject,
    manifest,
    fixedBank: null,
    compileAsm: async (...args) => {
      asmCompiles++;
      return assemble(...args);
    },
    compileFixed: async (...args) => {
      fixedCompiles++;
      return fixedBank(...args);
    },
    incrementalCache: cache,
    buildSignature: "test-v1"
  });
}

function projectWith(bank1, bank2) {
  return {
    projectFiles: [
      file("bank1.asm", `org $C000\n${bank1}`),
      file("bank2.asm", `org $C000\n${bank2}`)
    ]
  };
}

function file(path, source) {
  return { path, kind: "asm-source", base64: Buffer.from(source, "utf8").toString("base64") };
}

async function fixedBank() {
  return assemble("org $8000\ndb $55,$AA\n", "fixed.asm");
}

async function assemble(source, filename) {
  const result = await assembleAmysCVAssembly({ [filename]: source }, filename, {
    outputFilename: filename.replace(/\.asm$/i, ".bin"),
    outputMode: "binary",
    optimize: false
  });
  if (!result.ok) throw new Error(result.log);
  return { bytes: result.binary || result.bytes, symbols: result.symbols, sourceDebugMap: result.sourceDebugMap };
}
