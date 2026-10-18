#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";
import { buildAdamExpansionDisk } from "../studio/core/adamDiskImage.js";
import { createProjectFromTemplate } from "../studio/core/newProjectTemplates.js";
import {
  GearcolecoTestCore,
  GEARCOLECO_ADAM_MEDIA,
  GEARCOLECO_ADAM_SLOT,
  GEARCOLECO_TEST_INPUT,
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const firmwareRoot = join(root, "studio", "bios", "adam");
const captureDir = process.argv.includes("--artifacts") ? join(root, "artifacts", "ti99-ports") : "";
const cases = [
  { id: "southern-states", expected: "IDENTIFY THE STATES" },
  { id: "mystery-spell", expected: "COMPUTE! SEPTEMBER 1983" },
];

const base = { version: 2, sourceLang: "amy", projectFiles: [], generatedAsm: "" };
const template = createProjectFromTemplate(base, {
  templateId: "adam-hybrid",
  projectName: "TI-99 Port Runtime",
  medium: "dsk",
});
const templateText = (path) => Buffer.from(
  template.projectFiles.find((file) => file.path === path).base64,
  "base64",
).toString("utf8");
const assemble = async (source, filename) => {
  const result = await assembleAmysCVAssembly({ "main.asm": source }, "main.asm", {
    outputFilename: filename.replace(/\.asm$/i, ".bin"),
    outputMode: "binary",
    optimize: false,
  });
  assert.equal(result.ok, true, result.log);
  return result.binary || result.bytes;
};

const temp = mkdtempSync(join(tmpdir(), "amy-ti99-adam-"));
try {
  for (const testCase of cases) {
    const asmPath = join(temp, `${testCase.id}.asm`);
    const romPath = join(temp, `${testCase.id}.rom`);
    const compile = spawnSync(process.execPath, [
      join(root, "tools", "amyc.mjs"),
      join(root, "studio", "examples-src", `${testCase.id}.alexis`),
      "--target", "adam-disk",
      "--medium", "dsk",
      "--memory-profile", "adam-os7-eos-drivers",
      "--opt", "balanced",
      "--asm", asmPath,
      "--rom", romPath,
    ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(compile.status, 0, `${compile.error?.stack || ""}${compile.stdout || ""}${compile.stderr || ""}`);

    const built = await buildAdamExpansionDisk({
      rom: readFileSync(romPath),
      packs: [],
      bootSource: templateText("src/boot.asm"),
      loaderSource: templateText("src/expansion-loader.asm"),
      assemble,
    });
    if (captureDir) {
      mkdirSync(captureDir, { recursive: true });
      writeFileSync(join(captureDir, `${testCase.id}-adam.dsk`), built.media);
    }
    const core = await GearcolecoTestCore.create({ seed: 0x54493941 });
    try {
      core.loadAdamFirmware({
        os7: readFileSync(join(firmwareRoot, "OS7.ROM")),
        eos: readFileSync(join(firmwareRoot, "EOS.ROM")),
        smartwriter: readFileSync(join(firmwareRoot, "WP.ROM")),
      });
      core.startAdam();
      core.loadAdamMedia(built.media, {
        slot: GEARCOLECO_ADAM_SLOT.DISK_1,
        type: GEARCOLECO_ADAM_MEDIA.DISK,
        writeProtected: false,
      });
      core.reset();

      for (let frame = 0; frame < 900; frame += 1) core.runFrame();
      tap(core, GEARCOLECO_TEST_INPUT.FIRE_LEFT | GEARCOLECO_TEST_INPUT.FIRE_RIGHT);
      for (let frame = 0; frame < 90; frame += 1) core.runFrame();
      tap(core, GEARCOLECO_TEST_INPUT.KEYPAD_1);

      let screen = "";
      const fontTransitions = [];
      let previousFontState = null;
      for (let frame = 0; frame < 2400; frame += 1) {
        core.runFrame();
        const fontState = [...core.readVram(65 * 8, 8)].some(Boolean);
        if (fontState !== previousFontState) {
          fontTransitions.push({ frame, fontState, pc: core.getPc() });
          previousFontState = fontState;
        }
        if ((frame & 15) === 15) {
          screen = String.fromCharCode(...core.readVram(0x1800, 768));
          if (screen.includes(testCase.expected) && fontState) break;
        }
      }
      assert.match(screen, new RegExp(testCase.expected), `${testCase.id} did not reach its ADAM program screen`);
      const letterA = [...core.readVram(65 * 8, 8)];
      assert.ok(letterA.some(Boolean), `${testCase.id} reached its text but the active uppercase font is blank; VDP=${JSON.stringify([...core.getVdpRegisters()].slice(0, 8))}; transitions=${JSON.stringify(fontTransitions)}`);
      assert.equal(core.readAdamMedia(GEARCOLECO_ADAM_SLOT.DISK_1).byteLength, built.media.byteLength, `${testCase.id} disk was not mounted`);
      console.log(`${testCase.id}: PASS (bootable writable ADAM DSK)`);
    } finally {
      core.destroy();
    }
  }
  console.log(`TI-99/4A ADAM port runtime test: PASS (${cases.length} projects)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

function tap(core, mask) {
  core.setControllerMask(0, mask);
  for (let frame = 0; frame < 4; frame += 1) core.runFrame();
  core.setControllerMask(0, 0);
  for (let frame = 0; frame < 45; frame += 1) core.runFrame();
}
