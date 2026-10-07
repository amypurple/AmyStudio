#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { buildAdamBootDataPack, buildAdamBootDisk } from "../studio/core/adamDiskImage.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "build", "adam-project-forms");
fs.mkdirSync(output, { recursive: true });

const sourcePath = path.join(root, "studio", "examples-src", "adam-eos-native-starter-boot.asm");
const source = fs.readFileSync(sourcePath, "utf8");
const assembled = await assembleAmysCVAssembly({ "boot.asm": source }, "boot.asm", {
  outputFilename: "adam-eos-native-starter.bin",
  outputMode: "binary",
  optimize: false
});
if (!assembled.ok) throw new Error(assembled.log);
const boot = assembled.binary || assembled.bytes;
const disk = buildAdamBootDisk({ boot, volume: "AMY EOS" });
const dataPack = buildAdamBootDataPack({ boot, volume: "AMY EOS" });

write("adam-eos-native-starter.bin", boot);
write("adam-eos-native-starter.dsk", disk.media);
write("adam-eos-native-starter.ddp", dataPack.media);

const where = path.join(root, "build", "where-on-earth-adam");
copyIfPresent(path.join(where, "where-on-earth-adam.dsk"), "where-on-earth-os7-eos.dsk");
copyIfPresent(path.join(where, "where-on-earth-adam.ddp"), "where-on-earth-os7-eos.ddp");
copyIfPresent(path.join(where, "where-on-earth-adam.rom"), "where-on-earth-colecovision.rom");

const manifest = {
  generatedAt: new Date().toISOString(),
  forms: [
    entry("adam-eos-native-starter.dsk", "disk", "native-eos", "EOS boot block; no OS7 or cartridge"),
    entry("adam-eos-native-starter.ddp", "data-pack", "native-eos", "Same EOS program in linear Data Pack media"),
    entry("adam-eos-native-starter.bin", "binary", "native-eos", "Raw 1 KB-or-smaller EOS boot payload"),
    entry("where-on-earth-os7-eos.dsk", "disk", "os7-eos-hybrid", "OS7 game runtime plus EOS media loader and WEPK files"),
    entry("where-on-earth-os7-eos.ddp", "data-pack", "os7-eos-hybrid", "Same hybrid project on Data Pack"),
    entry("where-on-earth-colecovision.rom", "cartridge", "os7", "Standalone ColecoVision edition")
  ].filter((item) => item.bytes != null)
};
fs.writeFileSync(path.join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${manifest.forms.length} ADAM/Coleco project forms in ${output}`);

function write(name, bytes) {
  fs.writeFileSync(path.join(output, name), bytes);
}
function copyIfPresent(from, name) {
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(output, name));
}
function entry(file, medium, runtime, description) {
  const full = path.join(output, file);
  return { file, medium, runtime, description, bytes: fs.existsSync(full) ? fs.statSync(full).size : null };
}
