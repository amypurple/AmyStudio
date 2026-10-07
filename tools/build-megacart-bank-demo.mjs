#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { buildMegaCartImage } from "../studio/core/megaCartImage.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "studio", "examples-src");
const output = path.join(root, "build", "megacart-bank-demo");
fs.mkdirSync(output, { recursive: true });

const fixed = await assemble("megacart-bank-demo-fixed.asm");
const bank1 = await assemble("megacart-bank-demo-bank1.asm");
const bank2 = await assemble("megacart-bank-demo-bank2.asm");
for (const sizeKb of [64, 128]) {
  const { image, layout } = buildMegaCartImage({
    sizeKb,
    fixedBank: fixed,
    switchableBanks: [{ bank: 0, bytes: bank1 }, { bank: 1, bytes: bank2 }]
  });
  fs.writeFileSync(path.join(output, `megacart-bank-demo-${sizeKb}k.rom`), image);
  if (sizeKb === 128) fs.writeFileSync(path.join(output, "megacart-bank-demo.rom"), image);
  console.log(`MegaCart demo: ${image.length} bytes, ${layout.bankCount} banks, fixed bank ${layout.fixedBank}.`);
}
fs.copyFileSync(path.join(sourceRoot, "megacart-bank-demo.amy.json"), path.join(output, "project.amy.json"));

async function assemble(name) {
  const source = fs.readFileSync(path.join(sourceRoot, name), "utf8");
  const result = await assembleAmysCVAssembly({ [name]: source }, name, {
    outputFilename: name.replace(/\.asm$/i, ".bin"), outputMode: "binary", optimize: false
  });
  if (!result.ok) throw new Error(result.log);
  return result.binary || result.bytes;
}
