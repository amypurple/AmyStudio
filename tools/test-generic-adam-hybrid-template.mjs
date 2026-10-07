#!/usr/bin/env node
import assert from "node:assert/strict";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { buildAdamExpansionDataPack, buildAdamExpansionDisk } from "../studio/core/adamDiskImage.js";
import { createProjectFromTemplate } from "../studio/core/newProjectTemplates.js";

const base = { version: 2, sourceLang: "amy", projectFiles: [], generatedAsm: "" };
const template = createProjectFromTemplate(base, {
  templateId: "adam-hybrid",
  projectName: "Hybrid Test",
  medium: "dsk"
});
const text = (path) => Buffer.from(template.projectFiles.find((file) => file.path === path).base64, "base64").toString("utf8");
const assemble = async (source, filename) => {
  const result = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
    outputFilename: filename.replace(/\.asm$/i, ".bin"),
    outputMode: "binary",
    optimize: false
  });
  assert.equal(result.ok, true, result.log);
  return result.binary || result.bytes;
};
const options = {
  rom: new Uint8Array(32 * 1024).fill(0xff),
  packs: [],
  bootSource: text("src/boot.asm"),
  loaderSource: text("src/expansion-loader.asm"),
  assemble
};
const disk = await buildAdamExpansionDisk(options);
const dataPack = await buildAdamExpansionDataPack(options);

assert.equal(disk.media.length, 160 * 1024);
assert.equal(dataPack.media.length, 256 * 1024);
assert.equal(disk.packs.length, 0);
assert.equal(dataPack.packs.length, 0);
assert.ok(disk.bootBytes > 0 && disk.bootBytes <= 1024);
assert.ok(dataPack.bootBytes > 0 && dataPack.bootBytes <= 1024);
assert.ok(findSequence(dataPack.media.subarray(0, 3 * 1024), [0x3e, 0x08, 0xcd, 0xf3, 0xfc]) >= 0,
  "The DDP loader must read through ADAMnet device $08.");
assert.ok(findSequence(dataPack.media.subarray(0, 3 * 1024), [0x3e, 0x0b, 0xd3, 0x7f, 0xc3, 0x00, 0x00]) >= 0,
  "The generic loader must select console expansion RAM before entering OS7 at $0000.");

console.log(`Generic ADAM hybrid template PASS: DSK ${disk.media.length}, DDP ${dataPack.media.length}, boot ${disk.bootBytes}/${dataPack.bootBytes} bytes.`);

function findSequence(bytes, sequence) {
  return bytes.findIndex((_, index) => sequence.every((byte, offset) => bytes[index + offset] === byte));
}
