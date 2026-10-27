#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { compressBytes, decompressBytes } from "../studio/core/compression.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-zx0-vram-long-literal-"));

// This deterministic random payload is encoded by ZX0 as a 257-byte literal run.
const bytes = [];
let state = 0x120C257;
for (let index = 0; index < 257; index += 1) {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  bytes.push(state & 0xFF);
}
const packed = [...await compressBytes("zx0", bytes)];
assert.deepEqual([...await decompressBytes("zx0", packed)], bytes, "ZX0 fixture round trip");

const rows = [];
for (let offset = 0; offset < packed.length; offset += 16) {
  const separator = offset + 16 < packed.length ? "," : "";
  rows.push(`  ${packed.slice(offset, offset + 16).map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",")}${separator}`);
}

const source = `data Payload bytes\n${rows.join("\n")}\nend data\n\n` +
  "screen off\n" +
  "decompress zx0 Payload to vram $2000\n" +
  "loop forever\n";

try {
  const sourcePath = join(temp, "zx0-vram-long-literal.alexis");
  const romPath = join(temp, "zx0-vram-long-literal.rom");
  writeFileSync(sourcePath, source);
  const result = spawnSync(process.execPath, [
    resolve(root, "tools/amyc.mjs"), sourcePath,
    "--rom", romPath,
    "--opt", "balanced"
  ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, result.error?.stack || result.stdout || result.stderr);

  const core = await GearcolecoTestCore.create({ seed: 0x5A583032 });
  try {
    core.loadBios(readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom")));
    core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 60; frame += 1) core.runFrame();
    assert.deepEqual([...core.readVram(0x2000, bytes.length)], bytes, "ZX0 lost bytes after the first partial literal page");
  } finally {
    core.destroy();
  }

  console.log("ZX0 VRAM long-literal runtime: PASS (257 bytes)");
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
