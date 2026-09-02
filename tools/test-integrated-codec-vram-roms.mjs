import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compressBytes, decompressBytes, getCompressionCatalog } from "../studio/core/compression.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "amy-codec-vram-"));
const bios = fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom"));
const pattern = await rawWarriorTable("pattern");
const color = await rawWarriorTable("color");
const codecs = getCompressionCatalog().filter(({ codecId }) => codecId !== "raw");
const amyCodecNames = { bitbuster12: "bitbuster" };
const results = [];

try {
  for (const { codecId } of codecs) {
    const amyCodec = amyCodecNames[codecId] ?? codecId;
    const packedPattern = new Uint8Array(await compressBytes(codecId, pattern));
    const packedColor = new Uint8Array(await compressBytes(codecId, color));
    const sourcePath = path.join(temporary, `${codecId}-vram.alexis`);
    const romPath = path.join(temporary, `${codecId}-vram.rom`);
    fs.writeFileSync(sourcePath, [
      `project "${codecId.toUpperCase()} VRAM SELFTEST"`,
      'memory "colecovision_legacy_sdcc"',
      "bitmap screen",
      "screen off",
      "nmi off",
      `decompress ${amyCodec} PackedPattern to vram.pattern`,
      `decompress ${amyCodec} PackedColor to vram.color`,
      "screen on",
      "loop forever",
      amyData("PackedPattern", packedPattern),
      amyData("PackedColor", packedColor),
      ""
    ].join("\n"));

    const compile = spawnSync(process.execPath, [path.join(root, "tools", "amyc.mjs"), sourcePath, "--rom", romPath, "--opt", "balanced"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024
    });
    assert.equal(compile.status, 0, `${codecId}: compile failed (${compile.error?.message ?? "no process error"})\n${compile.stdout ?? ""}\n${compile.stderr ?? ""}`);

    const core = await GearcolecoTestCore.create({ seed: 0xc0dec });
    try {
      core.loadBios(bios);
      core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 180; frame += 1) core.runFrame();
      assertBytesEqual(core.readVram(0x0000, 6144), pattern, `${codecId}: pattern VRAM differs`);
      assertBytesEqual(core.readVram(0x2000, 6144), color, `${codecId}: color VRAM differs`);
    } finally {
      core.destroy();
    }
    results.push({ codec: codecId, payload: packedPattern.length + packedColor.length, rom: fs.statSync(romPath).size });
  }

  console.log(`Integrated codec VRAM ROM tests PASS (${results.length}/${codecs.length})`);
  console.table(results);
} finally {
  if (process.env.AMY_KEEP_TEMP) console.error(`Preserved codec test files in ${temporary}`);
  else fs.rmSync(temporary, { recursive: true, force: true });
}

async function rawWarriorTable(name) {
  const assetRoot = path.join(root, "assets", "compressed", "warrior");
  const source = fs.existsSync(path.join(assetRoot, `${name}.zx0`))
    ? { codec: "zx0", path: path.join(assetRoot, `${name}.zx0`) }
    : { codec: "dan2", path: path.join(assetRoot, `${name}.dan2`) };
  const raw = new Uint8Array(await decompressBytes(source.codec, fs.readFileSync(source.path)));
  assert.equal(raw.length, 6144, `${name}: expected 6144 decoded bytes`);
  return raw;
}

function amyData(name, bytes) {
  const rows = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    rows.push(`  ${[...bytes.subarray(offset, offset + 16)].map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",")}`);
  }
  return `data ${name} bytes\n${rows.join("\n")}\nend data`;
}

function assertBytesEqual(actual, expected, message) {
  assert.equal(actual.length, expected.length, `${message}: length mismatch`);
  for (let index = 0; index < expected.length; index += 1) {
    assert.equal(actual[index], expected[index], `${message}: first mismatch at byte ${index}`);
  }
}

