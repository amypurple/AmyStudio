import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = `org $8000\n${fs.readFileSync(path.join(root, "src/compression/msc1_vram.asm"), "utf8")}`;
const result = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
  outputFilename: "msc1-vram.bin",
  outputMode: "binary",
  targetPlatform: "coleco",
  optimizerEnabled: false
});
assert.equal(result.ok, true, result.log);
const binary = result.binary || result.bytes;
assert.equal(binary?.length, 68);
console.log(`MSC1 direct-to-VRAM routine: ${binary.length} bytes`);
