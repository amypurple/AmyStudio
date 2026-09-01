import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZX1Codec } from "../studio/vendor/retrocompress-lite/js/codecs/zx1.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const zx1 = path.join(root, "tools", "competition", "zx1-source", "win", "zx1.exe");
const dzx1 = path.join(root, "tools", "competition", "zx1-source", "win", "dzx1.exe");
const hasOfficialTools = fs.existsSync(zx1) && fs.existsSync(dzx1);
const codec = new ZX1Codec();
let seed = 0x731a95c2;
const randomBytes = (length) => Uint8Array.from({ length }, () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed >>> 24;
});
const cases = [
  Uint8Array.of(0),
  Uint8Array.of(1, 2, 3, 4, 5),
  Uint8Array.from({ length: 400 }, () => 0x5a),
  Uint8Array.from({ length: 768 }, (_, index) => index & 31),
  randomBytes(1024)
];

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "amy-zx1-"));
try {
  for (const [index, input] of cases.entries()) {
    const raw = path.join(temporary, `case-${index}.bin`);
    const officialPacked = `${raw}.zx1`;
    const jsPackedPath = path.join(temporary, `case-${index}.js.zx1`);
    const officialDecoded = path.join(temporary, `case-${index}.decoded.bin`);
    fs.writeFileSync(raw, input);
    const packed = await codec.compress(input);
    assert.deepEqual(await codec.decompress(packed), input, `ZX1 roundtrip differs for ${input.length} bytes`);
    if (hasOfficialTools) {
      execFileSync(zx1, ["-f", raw, officialPacked], { stdio: "ignore" });
      const official = new Uint8Array(fs.readFileSync(officialPacked));
      assert.deepEqual(packed, official, `ZX1 optimal stream differs for ${input.length} bytes`);
      assert.deepEqual(await codec.decompress(official), input, `JavaScript decoder rejected official stream for ${input.length} bytes`);
      fs.writeFileSync(jsPackedPath, packed);
      execFileSync(dzx1, ["-f", jsPackedPath, officialDecoded], { stdio: "ignore" });
      assert.deepEqual(new Uint8Array(fs.readFileSync(officialDecoded)), input, `Official decoder rejected JavaScript stream for ${input.length} bytes`);
    }
  }
  assert.deepEqual(await codec.decompress(new Uint8Array()), new Uint8Array());
  await assert.rejects(() => codec.decompress(Uint8Array.of(0x80)), /Truncated/);
  console.log(`ZX1 codec: ${cases.length} ${hasOfficialTools ? "official bidirectional" : "roundtrip"} cases PASS`);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
