import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZX2Codec } from "../studio/vendor/retrocompress-lite/js/codecs/zx2.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generated = path.join(root, "build", "competition", "bitmap-picture", "generated");
const warriorPattern = path.join(generated, "warrior.pattern.bin");
const warriorColor = path.join(generated, "warrior.color.bin");
const hasWarrior = !process.argv.includes("--synthetic") && fs.existsSync(warriorPattern) && fs.existsSync(warriorColor);
const pattern = hasWarrior
  ? new Uint8Array(fs.readFileSync(warriorPattern))
  : Uint8Array.from({ length: 6144 }, (_, index) => ((index >> 3) ^ index) & 0xff);
const color = hasWarrior
  ? new Uint8Array(fs.readFileSync(warriorColor))
  : Uint8Array.from({ length: 6144 }, (_, index) => ((index >> 6) & 1) ? 0xf1 : 0x1f);
assert.equal(pattern.length, 6144);
assert.equal(color.length, 6144);

const codec = new ZX2Codec();
const [packedPattern, packedColor] = await Promise.all([codec.compress(pattern), codec.compress(color)]);
const bytesData = (name, bytes) => {
  const rows = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    rows.push(`  ${[...bytes.subarray(offset, offset + 16)].map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",")}`);
  }
  return `data ${name} bytes\n${rows.join("\n")}\nend data`;
};
const source = `${bytesData("Zx2Pattern", packedPattern)}\n\n${bytesData("Zx2Color", packedColor)}\n\nbitmap screen\nscreen off\nnmi off\ndecompress zx2 Zx2Pattern to vram.pattern\ndecompress zx2 Zx2Color to vram.color\nscreen on\nloop forever\n`;

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "amy-zx2-vram-"));
try {
  const amy = path.join(temporary, "zx2-vram.alexis");
  fs.writeFileSync(amy, source);
  const bios = fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom"));
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const romPath = path.join(temporary, `zx2-${profile}.rom`);
    const result = spawnSync(process.execPath, [path.join(root, "tools", "amyc.mjs"), amy, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${profile} compile failed:\n${result.stdout}\n${result.stderr}`);
    const core = await GearcolecoTestCore.create({ seed: 0x72a2 });
    try {
      core.loadBios(bios);
      core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 180; frame += 1) core.runFrame();
      assert.deepEqual(core.readVram(0x0000, 6144), pattern, `${profile}: ZX2 pattern VRAM differs`);
      assert.deepEqual(core.readVram(0x2000, 6144), color, `${profile}: ZX2 color VRAM differs`);
    } finally {
      core.destroy();
    }
  }
  console.log(`ZX2 VRAM (${hasWarrior ? "Warrior" : "synthetic tables"}): ${packedPattern.length + packedColor.length} payload bytes, 5 profiles PASS`);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
