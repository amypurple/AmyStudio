#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { buildMegaCartProject } from "../studio/core/megaCartProjectBuild.js";
import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examples = path.join(root, "studio", "examples-src");
const fixed = await assemble(fs.readFileSync(path.join(examples, "megacart-bank-demo-fixed.asm"), "utf8"), "fixed.asm");
const files = [
  textFile("banks/bank1.asm", fs.readFileSync(path.join(examples, "megacart-bank-demo-bank1.asm"), "utf8")),
  textFile("banks/bank2.amy", "data Bank2Text bytes = 68,65,84,65,32,70,82,79,77,32,66,65,78,75,32,50")
];
const manifest = {
  target: { platform: "colecovision-megacart", romSizeKb: 128 },
  outputs: [
    { name: "FIXED", type: "fixed-bank", sources: [{ path: "main.amy", kind: "amy" }] },
    { name: "BANK1", type: "switchable-bank", bank: 1, sources: [{ path: "banks/bank1.asm", kind: "asm" }] },
    { name: "BANK2", type: "switchable-bank", bank: 2, sources: [{ path: "banks/bank2.amy", kind: "amy" }] }
  ]
};
const built = await buildMegaCartProject({
  project: { projectFiles: files },
  manifest,
  fixedBank: fixed,
  compileAsm: assemble,
  compileAmyBank: async (source) => {
    const transpiled = transpileAmyForTest(source, {
      buildContext: {
        platform: "colecovision-megacart-bank",
        memoryProfile: "colecovision_legacy_sdcc",
        capabilities: ["os7", "megacart", "bank-local"],
        bank: 2
      }
    });
    assert.equal(transpiled.ok, true, transpiled.log);
    return `org $C000\n${transpiled.asmBody}`;
  }
});
assert.equal(built.image.length, 128 * 1024);
assert.equal(built.linkMap.sections.length, 3);
assert.deepEqual(built.linkMap.sections.map((section) => section.logicalBank), [0, 1, 2]);
assert.deepEqual(built.linkMap.sections.map((section) => section.fileOffset), [7 * 0x4000, 0, 0x4000]);
assert.deepEqual(built.linkMap.sections.slice(1).map((section) => section.logicalStart), [0xC000, 0xC000]);
assert.equal(built.linkMap.sections[1].symbols.some((symbol) => symbol.name === "Bank1Text"), true);
assert.equal(built.linkMap.sections[2].symbols.some((symbol) => symbol.name === "AMY_UDATA_Bank2Text"), true);

const firmware = process.env.AMY_COLECO_BIOS || path.join(root, "studio", "bios", "colecovision.rom");
const core = await GearcolecoTestCore.create({ seed: 0x4d43 });
try {
  core.loadBios(fs.readFileSync(firmware));
  core.loadRom(built.image);
  core.reset();
  for (let frame = 0; frame < 180; frame++) core.runFrame();
  assert.equal(String.fromCharCode(...core.readVram(0x1928, 16)), "DATA FROM BANK 1");
  assert.equal(String.fromCharCode(...core.readVram(0x1968, 16)), "DATA FROM BANK 2");
} finally {
  core.destroy();
}
console.log("MegaCart project build: PASS (bank-qualified map, manifest outputs, packaging, and GearColeco switching)");

async function assemble(source, filename) {
  const result = await assembleAmysCVAssembly({ [filename]: source }, filename, {
    outputFilename: filename.replace(/\.asm$/i, ".bin"), outputMode: "binary", optimize: false
  });
  if (!result.ok) throw new Error(result.log);
  return { bytes: result.binary || result.bytes, symbols: result.symbols, sourceDebugMap: result.sourceDebugMap };
}

function textFile(filePath, text) {
  return { path: filePath, kind: "asm-source", base64: Buffer.from(text, "utf8").toString("base64") };
}
