#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import { mickey120cProjectFiles } from "../studio/examples-mickey-120c-assets.generated.js";
import { decompressBytes } from "../studio/core/compression.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-mickey-120c-"));
const sourcePath = resolve(root, "studio/examples-src/mickey-120-color-picture.alexis");

function hashFramebuffer(core) {
  const pixels = core.getFramebuffer().pixels;
  return createHash("sha256").update(Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength)).digest("hex");
}

function assertBytes(actual, expected, label) {
  const mismatch = actual.findIndex((value, index) => value !== expected[index]);
  assert.equal(mismatch, -1, `${label}: mismatch at $${mismatch.toString(16).toUpperCase().padStart(4, "0")} (got $${actual[mismatch]?.toString(16).padStart(2, "0")}, expected $${expected[mismatch]?.toString(16).padStart(2, "0")})`);
}

try {
  for (const file of mickey120cProjectFiles) {
    writeFileSync(join(temp, file.path), Buffer.from(file.base64, "base64"));
  }

  const romPath = join(temp, "mickey-120-color-picture.rom");
  const result = spawnSync(process.execPath, [
    resolve(root, "tools/amyc.mjs"), sourcePath,
    "--rom", romPath,
    "--opt", "balanced",
    "--project-dir", temp
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, result.error?.stack || result.stdout || result.stderr);

  const expected = new Map();
  for (const file of mickey120cProjectFiles) {
    expected.set(file.path, new Uint8Array(await decompressBytes("zx0", Buffer.from(file.base64, "base64"))));
  }

  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  const core = await GearcolecoTestCore.create({ seed: 0x120C });
  try {
    core.loadBios(bios);
    core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 180; frame += 1) core.runFrame();

    assertBytes(core.readVram(0x0000, 0x1800), expected.get("mickey-120c-bank-a.zx0"), "VRAM bank A");
    assertBytes(core.readVram(0x1800, 0x0300), expected.get("mickey-120c-name.zx0"), "VRAM name table");
    assertBytes(core.readVram(0x2000, 0x1800), expected.get("mickey-120c-bank-b.zx0"), "VRAM bank B");

    const phases = [];
    for (let frame = 0; frame < 2; frame += 1) {
      phases.push({ registers: core.getVdpRegisters().slice(3, 5), hash: hashFramebuffer(core) });
      core.runFrame();
    }
    assert.deepEqual(new Set(phases.map(({ registers }) => registers.join(","))), new Set(["127,4", "255,0"]));
    assert.equal(new Set(phases.map(({ hash }) => hash)).size, 2, "Both temporal phases must render differently");
  } finally {
    core.destroy();
  }

  console.log(`Mickey 120-color example: PASS (${readFileSync(romPath).length} bytes occupied)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
