#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { buildAdamExpansionDataPack, buildAdamExpansionDisk } from "../studio/core/adamDiskImage.js";
import { createProjectFromTemplate } from "../studio/core/newProjectTemplates.js";
import {
  GearcolecoTestCore,
  GEARCOLECO_ADAM_MEDIA,
  GEARCOLECO_ADAM_SLOT
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-generic-hybrid-runtime-"));
const firmwareRoot = join(root, "studio", "bios", "adam");

try {
  const sourcePath = join(temp, "hybrid.amy");
  const asmPath = join(temp, "hybrid.asm");
  const romPath = join(temp, "hybrid.rom");
  writeFileSync(sourcePath, `
u8 HybridPassed = 0

sub start:
  HybridPassed = $A5
  text screen
  cls
  print at 5, 8, "GENERIC HYBRID"
  print at 4, 12, "OS7 LOADED BY EOS"
  loop forever
end sub
`);
  const compile = spawnSync(process.execPath, [
    join(root, "tools", "amyc.mjs"), sourcePath,
    "--target", "adam-disk", "--medium", "dsk",
    "--memory-profile", "adam-os7-eos-drivers",
    "--opt", "balanced", "--asm", asmPath, "--rom", romPath
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(compile.status, 0, `${compile.error?.stack || ""}${compile.stdout || ""}${compile.stderr || ""}`);
  const asm = readFileSync(asmPath, "utf8");
  const signatureMatch = asm.match(/^AMY_UVAR_HybridPassed\s+EQU\s+\$([0-9A-F]+)$/mi);
  assert.ok(signatureMatch, "compiled HybridPassed address is absent");
  const signatureAddress = Number.parseInt(signatureMatch[1], 16);

  const base = { version: 2, sourceLang: "amy", projectFiles: [], generatedAsm: "" };
  const template = createProjectFromTemplate(base, {
    templateId: "adam-hybrid",
    projectName: "Hybrid Runtime",
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
    rom: readFileSync(romPath),
    packs: [],
    bootSource: text("src/boot.asm"),
    loaderSource: text("src/expansion-loader.asm"),
    assemble
  };
  const media = [
    ["DSK", await buildAdamExpansionDisk(options), GEARCOLECO_ADAM_SLOT.DISK_1, GEARCOLECO_ADAM_MEDIA.DISK],
    ["DDP", await buildAdamExpansionDataPack(options), GEARCOLECO_ADAM_SLOT.DATA_PACK_1, GEARCOLECO_ADAM_MEDIA.DATA_PACK]
  ];

  for (const [name, built, slot, type] of media) {
    const core = await GearcolecoTestCore.create({ seed: 0x48594252 });
    try {
      core.loadAdamFirmware({
        os7: readFileSync(join(firmwareRoot, "OS7.ROM")),
        eos: readFileSync(join(firmwareRoot, "EOS.ROM")),
        smartwriter: readFileSync(join(firmwareRoot, "WP.ROM"))
      });
      core.startAdam();
      core.loadAdamMedia(built.media, { slot, type, writeProtected: true });
      core.reset();
      let screen = "";
      for (let frame = 0; frame < 1800; frame += 1) {
        core.runFrame();
        if ((frame & 15) === 15) {
          screen = String.fromCharCode(...core.readVram(0x1800, 768));
          if (screen.includes("OS7 LOADED BY EOS")) break;
        }
      }
      assert.match(screen, /GENERIC HYBRID/, `${name} did not enter the generated OS7 program`);
      assert.match(screen, /OS7 LOADED BY EOS/, `${name} did not finish the EOS-to-OS7 transition`);
      assert.equal(core.readRam(signatureAddress, 1)[0], 0xA5, `${name} Amy RAM signature is absent`);
      console.log(`PASS ${name}: generic EOS loader entered the compiled Amy OS7 program`);
    } finally {
      core.destroy();
    }
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
