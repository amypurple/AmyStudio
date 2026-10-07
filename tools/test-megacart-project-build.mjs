#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { buildMegaCartProject } from "../studio/core/megaCartProjectBuild.js";
import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examples = path.join(root, "studio", "examples-src");
const fixed = await assemble(fs.readFileSync(path.join(examples, "megacart-bank-demo-fixed.asm"), "utf8"), "fixed.asm");
const files = [1, 2].map((bank) => textFile(`banks/bank${bank}.asm`, fs.readFileSync(path.join(examples, `megacart-bank-demo-bank${bank}.asm`), "utf8")));
const manifest = {
  target: { platform: "colecovision-megacart", romSizeKb: 128 },
  outputs: [
    { name: "FIXED", type: "fixed-bank", sources: [{ path: "main.amy", kind: "amy" }] },
    { name: "BANK1", type: "switchable-bank", bank: 1, sources: [{ path: "banks/bank1.asm", kind: "asm" }] },
    { name: "BANK2", type: "switchable-bank", bank: 2, sources: [{ path: "banks/bank2.asm", kind: "asm" }] }
  ]
};
const built = await buildMegaCartProject({
  project: { projectFiles: files }, manifest, fixedBank: fixed, compileAsm: assemble
});
assert.equal(built.image.length, 128 * 1024);

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
console.log("MegaCart project build: PASS (manifest outputs assembled, packaged, and bank-switched in GearColeco)");

async function assemble(source, filename) {
  const result = await assembleAmysCVAssembly({ [filename]: source }, filename, {
    outputFilename: filename.replace(/\.asm$/i, ".bin"), outputMode: "binary", optimize: false
  });
  if (!result.ok) throw new Error(result.log);
  return result.binary || result.bytes;
}

function textFile(filePath, text) {
  return { path: filePath, kind: "asm-source", base64: Buffer.from(text, "utf8").toString("base64") };
}
