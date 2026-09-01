import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compressBytes, decompressBytes } from "../studio/core/compression.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-aplib-vram-"));
const sourcePath = path.join(temp, "aplib-vram.alexis");
const romPath = path.join(temp, "aplib-vram.rom");

const pattern = await rawWarriorTable("pattern");
const color = await rawWarriorTable("color");
const packedPattern = new Uint8Array(await compressBytes("aplib", pattern));
const packedColor = new Uint8Array(await compressBytes("aplib", color));

fs.writeFileSync(sourcePath, [
  'project "APLIB VRAM SELFTEST"',
  'memory "colecovision_legacy_sdcc"',
  "bitmap screen",
  "nmi off",
  "decompress aplib PackedPattern to vram.pattern",
  "decompress aplib PackedColor to vram.color",
  "screen on",
  "loop forever",
  amyData("PackedPattern", packedPattern),
  amyData("PackedColor", packedColor),
  ""
].join("\n"));

try {
  execFileSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--rom", romPath, "--opt", "balanced"], {
    cwd: root,
    stdio: "pipe"
  });

  const core = await GearcolecoTestCore.create({ seed: 0xA511B });
  try {
    core.loadBios(fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom")));
    core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 180; frame += 1) core.runFrame();
    assert.deepEqual(Buffer.from(core.readVram(0x0000, 6144)), Buffer.from(pattern), "aPLib pattern VRAM mismatch");
    assert.deepEqual(Buffer.from(core.readVram(0x2000, 6144)), Buffer.from(color), "aPLib color VRAM mismatch");
  } finally {
    core.destroy();
  }
  console.log(`aPLib Amy VRAM ROM PASS (${fs.statSync(romPath).size} ROM bytes; ${packedPattern.length + packedColor.length} data bytes)`);
} finally {
  if (process.env.AMY_KEEP_TEMP) console.error(`Preserved aPLib test files in ${temp}`);
  else fs.rmSync(temp, { recursive: true, force: true });
}

async function rawWarriorTable(name) {
  const assetPath = path.join(root, "assets", "compressed", "warrior", `${name}.zx0`);
  if (fs.existsSync(assetPath)) {
    const raw = new Uint8Array(await decompressBytes("zx0", fs.readFileSync(assetPath)));
    assert.equal(raw.length, 6144);
    return raw;
  }
  let state = name === "pattern" ? 0x13579bdf : 0x2468ace0;
  return Uint8Array.from({ length: 6144 }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state >>> 24;
  });
}

function amyData(name, bytes) {
  const rows = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    rows.push(`  ${[...bytes.subarray(offset, offset + 16)].map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",")}`);
  }
  return `data ${name} bytes\n${rows.join("\n")}\nend data`;
}
