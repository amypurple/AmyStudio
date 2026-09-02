import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compressBytes, decompressBytes } from "../studio/core/compression.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { exampleCatalog } from "../studio/examples.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const corpus = [
  {
    name: "cake",
    example: "old-devkit-10years",
    codec: "zx0",
    pattern: "cake.pattern.zx0",
    color: "cake.color.zx0"
  },
  {
    name: "commando",
    example: "commando-music-box",
    codec: "dan2",
    pattern: "commando-title.pattern.dan2",
    color: "commando-title.color.dan2"
  },
  {
    name: "warrior",
    example: "warrior-barbarian-slideshow",
    codec: "zx0",
    pattern: "warrior.pattern.zx0",
    color: "warrior.color.zx0"
  },
  {
    name: "barbarian",
    example: "warrior-barbarian-slideshow",
    codec: "zx0",
    pattern: "barbarian.pattern.zx0",
    color: "barbarian.color.zx0"
  }
];

function sameBytes(actual, expected, message) {
  assert.equal(actual.length, expected.length, `${message}: length differs`);
  for (let index = 0; index < actual.length; index += 1) {
    assert.equal(actual[index], expected[index], `${message}: byte ${index} differs`);
  }
}

async function readTable(exampleId, file, codec) {
  const example = exampleCatalog.find((entry) => entry.id === exampleId);
  assert.ok(example, `${exampleId}: missing example`);
  const projectFile = example.projectFiles?.find((entry) => String(entry.path).replace(/^@project\//i, "") === file);
  assert.ok(projectFile?.base64, `${exampleId}: missing ${file}`);
  const bytes = new Uint8Array(Buffer.from(projectFile.base64, "base64"));
  return codec === "raw" ? bytes : new Uint8Array(await decompressBytes(codec, bytes));
}

function bytesData(name, bytes) {
  const rows = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    rows.push(`  ${[...bytes.subarray(offset, offset + 16)].map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",")}`);
  }
  return `data ${name} bytes\n${rows.join("\n")}\nend data`;
}

async function verifyVram(name, pattern, color, packedPattern, packedColor, profiles) {
  const source = `${bytesData("Zx1Pattern", packedPattern)}\n\n${bytesData("Zx1Color", packedColor)}\n\nbitmap screen\nscreen off\nnmi off\ndecompress zx1 Zx1Pattern to vram.pattern\ndecompress zx1 Zx1Color to vram.color\nscreen on\nloop forever\n`;
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), `amy-zx1-${name}-`));
  try {
    const amy = path.join(temporary, `${name}.alexis`);
    fs.writeFileSync(amy, source);
    const bios = fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom"));
    for (const profile of profiles) {
      const romPath = path.join(temporary, `${name}-${profile}.rom`);
      const result = spawnSync(process.execPath, [path.join(root, "tools", "amyc.mjs"), amy, "--rom", romPath, "--opt", profile], {
        cwd: root,
        encoding: "utf8"
      });
      assert.equal(result.status, 0, `${name}/${profile} compile failed:\n${result.stdout}\n${result.stderr}`);
      const core = await GearcolecoTestCore.create({ seed: 0x71a1 });
      try {
        core.loadBios(bios);
        core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
        for (let frame = 0; frame < 180; frame += 1) core.runFrame();
        sameBytes(core.readVram(0x0000, 6144), pattern, `${name}/${profile} pattern VRAM`);
        sameBytes(core.readVram(0x2000, 6144), color, `${name}/${profile} color VRAM`);
      } finally {
        core.destroy();
      }
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

const results = [];
for (const picture of corpus) {
  const pattern = await readTable(picture.example, picture.pattern, picture.codec);
  const color = await readTable(picture.example, picture.color, picture.codec);
  assert.equal(pattern.length, 6144, `${picture.name}: pattern must be 6144 bytes`);
  assert.equal(color.length, 6144, `${picture.name}: color must be 6144 bytes`);

  const zx0Pattern = new Uint8Array(await compressBytes("zx0", pattern));
  const zx0Color = new Uint8Array(await compressBytes("zx0", color));
  const zx1Pattern = new Uint8Array(await compressBytes("zx1", pattern));
  const zx1Color = new Uint8Array(await compressBytes("zx1", color));
  sameBytes(new Uint8Array(await decompressBytes("zx1", zx1Pattern)), pattern, `${picture.name} ZX1 pattern roundtrip`);
  sameBytes(new Uint8Array(await decompressBytes("zx1", zx1Color)), color, `${picture.name} ZX1 color roundtrip`);

  const profiles = picture.name === "warrior"
    ? ["off", "safe", "balanced", "aggressive", "experimental"]
    : ["balanced"];
  await verifyVram(picture.name, pattern, color, zx1Pattern, zx1Color, profiles);
  results.push({
    picture: picture.name,
    raw: pattern.length + color.length,
    zx0: zx0Pattern.length + zx0Color.length,
    zx1: zx1Pattern.length + zx1Color.length,
    zx1Total: zx1Pattern.length + zx1Color.length + 127
  });
}

const outputDir = path.join(root, "build", "audits", "zx1-picture-corpus");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "results.csv"), [
  "picture,raw,zx0,zx1,zx1_with_127_byte_vram_decoder",
  ...results.map((row) => `${row.picture},${row.raw},${row.zx0},${row.zx1},${row.zx1Total}`)
].join("\n") + "\n");

console.table(results);
console.log("ZX1 picture corpus: 4 exact images, 8 runtime ROM/profile cases PASS");
