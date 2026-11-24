#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { decompressBytes } from "../studio/core/compression.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { loadCodec } from "../studio/vendor/retrocompress-lite/js/codecConfig.js";
import { fourTwentyOneProjectFiles, dacmanProjectFiles, dacman2ProjectFiles } from "../studio/examples-games-assets.js";
import { chateauDragonProjectFiles } from "../studio/examples-chateau-assets.js";

const ENTRY_MARKER = Uint8Array.from([0xf5, 0x3e, 0xca, 0xee, 0xfe, 0xee, 0xfe, 0xfe, 0xca, 0xf1]);
const EXIT_MARKER = Uint8Array.from([0xf5, 0x3e, 0xbe, 0xee, 0xef, 0xee, 0xef, 0xfe, 0xbe, 0xf1]);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "competition", "benchmarks", "compression");
const ratios = JSON.parse(fs.readFileSync(path.join(output, "bitmap-codec-ratios.json"), "utf8"));
const representatives = JSON.parse(fs.readFileSync(path.join(output, "bitmap-codec-representatives.json"), "utf8")).pictures;
// UPKR has an independently measured candidate decoder, but it is not yet an
// Amy compiler/runtime option. Keep it out of this like-for-like ROM suite.
const codecIds = ratios.aggregate.map((row) => row.id).filter((id) => id !== "upkr");
const decoderBytes = ratios.decoderBytes;
const names = ratios.names;
const requestedCodec = argumentValue("--only");
const selectedCodecs = requestedCodec ? codecIds.filter((id) => id === requestedCodec) : codecIds;
assert.ok(selectedCodecs.length, `Unknown integrated codec: ${requestedCodec}`);

const allPictures = await loadPictures();
const selectedIds = process.argv.includes("--all") ? new Set(ratios.rows.map((item) => item.id)) : new Set(representatives.map((item) => item.id));
const pictures = allPictures.filter((item) => selectedIds.has(item.id));
assert.equal(pictures.length, selectedIds.size, "A selected corpus picture could not be loaded");

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "amy-codec-cycles-"));
const bios = fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom"));
const core = await GearcolecoTestCore.create({ seed: 0x4359434c });
const rows = [];

try {
  core.loadBios(bios);
  for (const picture of pictures) {
    for (const codecId of selectedCodecs) {
      process.stdout.write(`${picture.label}/${names[codecId]} ... `);
      const codec = await loadCodec(codecId);
      const packedPattern = Buffer.from(await codec.compress(picture.pattern));
      const packedColor = Buffer.from(await codec.compress(picture.color));
      assert.deepEqual(Buffer.from(await codec.decompress(packedPattern)), picture.pattern, `${picture.id}/${codecId} pattern host round-trip`);
      assert.deepEqual(Buffer.from(await codec.decompress(packedColor)), picture.color, `${picture.id}/${codecId} color host round-trip`);

      const stem = `${picture.id}-${codecId}`;
      const sourcePath = path.join(temporary, `${stem}.alexis`);
      const romPath = path.join(temporary, `${stem}.rom`);
      fs.writeFileSync(sourcePath, benchmarkSource(codecId, packedPattern, packedColor));
      compile(sourcePath, romPath);
      const rom = fs.readFileSync(romPath);
      const entry = uniqueMarkerAddress(rom, ENTRY_MARKER) + ENTRY_MARKER.length;
      const exit = uniqueMarkerAddress(rom, EXIT_MARKER);

      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      runToBreakpoint(core, entry, 180, `${picture.id}/${codecId} entry`);
      const started = core.getMasterClockCycles();
      runToBreakpoint(core, exit, 180, `${picture.id}/${codecId} exit`);
      const cycles = core.getMasterClockCycles() - started;
      assertBytesEqual(core.readVram(0x0000, 6144), picture.pattern, `${picture.id}/${codecId} pattern VRAM`);
      assertBytesEqual(core.readVram(0x2000, 6144), picture.color, `${picture.id}/${codecId} color VRAM`);

      rows.push({
        pictureId: picture.id,
        picture: picture.label,
        codecId,
        codec: names[codecId],
        payloadBytes: packedPattern.length + packedColor.length,
        decoderBytes: decoderBytes[codecId],
        cycles,
        ntscFrames: round(cycles / (228 * 262), 3),
        palFrames: round(cycles / (228 * 313), 3),
        ntscRefreshes: Math.ceil(cycles / (228 * 262)),
        palRefreshes: Math.ceil(cycles / (228 * 313)),
        exactVram: true
      });
      console.log(`${cycles.toLocaleString("en-US")} cycles`);
    }
  }
} finally {
  core.destroy();
  if (process.env.AMY_KEEP_TEMP || process.argv.includes("--keep-temp")) console.error(`Preserved ${temporary}`);
  else fs.rmSync(temporary, { recursive: true, force: true });
}

const ranking = selectedCodecs.map((codecId) => {
  const samples = rows.filter((row) => row.codecId === codecId);
  const cycles = samples.map((row) => row.cycles).sort((a, b) => a - b);
  const total = cycles.reduce((sum, value) => sum + value, 0);
  return {
    codecId,
    codec: names[codecId],
    decoderBytes: decoderBytes[codecId],
    sampleCount: samples.length,
    averageCycles: Math.round(total / samples.length),
    medianCycles: median(cycles),
    minCycles: cycles[0],
    maxCycles: cycles.at(-1),
    averageNtscFrames: round(total / samples.length / (228 * 262), 3),
    averagePalFrames: round(total / samples.length / (228 * 313), 3)
  };
}).sort((left, right) => left.averageCycles - right.averageCycles);

const report = {
  generatedBy: "tools/benchmark-codec-vram-cycles.mjs",
  scope: process.argv.includes("--all") ? "all-corpus-pictures" : "mechanical-representatives",
  timing: "GearColeco exact Z80 master-clock cycles; NMI disabled; two 6144-byte direct-to-VRAM streams per sample",
  ntscCyclesPerFrame: 228 * 262,
  palCyclesPerFrame: 228 * 313,
  ranking,
  rows
};
if (!requestedCodec) {
  fs.writeFileSync(path.join(output, "bitmap-codec-vram-cycles.json"), JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(path.join(output, "bitmap-codec-vram-cycles.csv"), csv([
    ["Picture", "Codec", "Payload bytes", "Decoder bytes", "Cycles", "NTSC frames", "PAL frames", "NTSC refreshes", "PAL refreshes", "Exact VRAM"],
    ...rows.map((row) => [row.picture, row.codec, row.payloadBytes, row.decoderBytes, row.cycles, row.ntscFrames, row.palFrames, row.ntscRefreshes, row.palRefreshes, row.exactVram ? "PASS" : "FAIL"])
  ]));
  fs.writeFileSync(path.join(output, "bitmap-codec-vram-cycle-ranking.csv"), csv([
    ["Rank", "Codec", "Decoder bytes", "Samples", "Average cycles", "Median cycles", "Minimum cycles", "Maximum cycles", "Average NTSC frames", "Average PAL frames"],
    ...ranking.map((row, index) => [index + 1, row.codec, row.decoderBytes, row.sampleCount, row.averageCycles, row.medianCycles, row.minCycles, row.maxCycles, row.averageNtscFrames, row.averagePalFrames])
  ]));
}
console.table(ranking);

function markerAsm(kind) {
  return kind === "entry"
    ? "push af\n    ld a,$CA\n    xor $FE\n    xor $FE\n    cp $CA\n    pop af"
    : "push af\n    ld a,$BE\n    xor $EF\n    xor $EF\n    cp $BE\n    pop af";
}

function benchmarkSource(codecId, pattern, color) {
  const amyCodec = codecId === "bitbuster12" ? "bitbuster" : codecId;
  return [
    `project "${codecId.toUpperCase()} VRAM CYCLE BENCHMARK"`,
    'memory "colecovision_legacy_sdcc"',
    "sub start:",
    "  bitmap screen",
    "  screen off",
    "  nmi off",
    `  asm {\n    ${markerAsm("entry")}\n  }`,
    `  decompress ${amyCodec} PackedPattern to vram.pattern`,
    `  decompress ${amyCodec} PackedColor to vram.color`,
    `  asm {\n    ${markerAsm("exit")}\n  }`,
    "  loop forever",
    amyData("PackedPattern", pattern),
    amyData("PackedColor", color),
    ""
  ].join("\n");
}

function compile(sourcePath, romPath) {
  const result = spawnSync(process.execPath, [path.join(root, "tools", "amyc.mjs"), sourcePath, "--rom", romPath, "--opt", "balanced"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
  assert.equal(result.status, 0, `Compile failed for ${path.basename(sourcePath)}: ${result.error?.message ?? ""}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
}

function runToBreakpoint(coreInstance, address, frameLimit, label) {
  coreInstance.clearAllBreakpoints();
  coreInstance.setExecuteBreakpoint(address);
  for (let frame = 0; frame < frameLimit; frame += 1) {
    const result = coreInstance.runFrame();
    if (result.breakpointHit && result.pc === address) {
      coreInstance.clearAllBreakpoints();
      return;
    }
  }
  throw new Error(`${label} was not reached within ${frameLimit} frames`);
}

function uniqueMarkerAddress(rom, marker) {
  const matches = [];
  for (let offset = 0; offset <= rom.length - marker.length; offset += 1) {
    if (marker.every((value, index) => rom[offset + index] === value)) matches.push(0x8000 + offset);
  }
  assert.equal(matches.length, 1, `Expected one benchmark marker, found ${matches.length}`);
  return matches[0];
}

function amyData(name, bytes) {
  const lines = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    lines.push(`  ${[...bytes.subarray(offset, offset + 16)].map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",")}`);
  }
  return `data ${name} bytes\n${lines.join("\n")}\nend data`;
}

function assertBytesEqual(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label} length`);
  for (let index = 0; index < expected.length; index += 1) {
    assert.equal(actual[index], expected[index], `${label} differs at byte ${index}`);
  }
}

function csv(lines) {
  return lines.map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n") + "\n";
}

function median(values) {
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : Math.round((values[middle - 1] + values[middle]) / 2);
}

function round(value, digits) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function bytes(entry) {
  return Buffer.from(entry.base64, "base64");
}

async function decodeProjectFile(files, name) {
  const entry = files.find((item) => item.path === name);
  if (!entry) throw new Error(`Missing project file ${name}`);
  return Buffer.from(await decompressBytes(entry.codec || path.extname(name).slice(1), bytes(entry)));
}

async function loadPictures() {
  const fixed = [
    { id: "cake", label: "Cake", codec: "zx0", pattern: "assets/compressed/old-devkit-10years/cake.pattern.zx0", color: "assets/compressed/old-devkit-10years/cake.color.zx0" },
    { id: "commando", label: "Commando", codec: "dan2", pattern: "assets/compressed/commando-title-pattern.dan2", color: "assets/compressed/commando-title-color.dan2" },
    { id: "warrior", label: "Warrior", codec: "zx0", pattern: "assets/compressed/warrior/pattern.zx0", color: "assets/compressed/warrior/color.zx0" },
    { id: "barbarian", label: "Barbarian", codec: "zx0", pattern: "assets/compressed/barbarian/pattern.zx0", color: "assets/compressed/barbarian/color.zx0" },
  ];
  const projects = [
    { id: "421-title", label: "421 title", files: fourTwentyOneProjectFiles, stem: "421-title" },
    { id: "dacman-title", label: "Dacman title", files: dacmanProjectFiles, stem: "dacman-title" },
    { id: "dacman-info", label: "Dacman info", files: dacmanProjectFiles, stem: "dacman-info" },
    { id: "dacman2-title", label: "Dacman 2 title", files: dacman2ProjectFiles, stem: "dacman2-title" },
    { id: "chateau-title", label: "Chateau title", files: chateauDragonProjectFiles, stem: "chateau-title" },
  ];
  const result = [];
  for (const picture of fixed) result.push({
    ...picture,
    pattern: Buffer.from(await decompressBytes(picture.codec, fs.readFileSync(path.join(root, picture.pattern)))),
    color: Buffer.from(await decompressBytes(picture.codec, fs.readFileSync(path.join(root, picture.color))))
  });
  for (const picture of projects) result.push({
    ...picture,
    pattern: await decodeProjectFile(picture.files, `${picture.stem}.pattern.zx0`),
    color: await decodeProjectFile(picture.files, `${picture.stem}.color.zx0`)
  });
  const manifest = JSON.parse(fs.readFileSync(path.join(output, "image-bank", "manifest.json"), "utf8"));
  for (const picture of manifest.rows) result.push({
    id: `bank-${picture.id}`,
    label: picture.picture,
    pattern: fs.readFileSync(path.join(root, picture.pattern)),
    color: fs.readFileSync(path.join(root, picture.color))
  });
  return result;
}
