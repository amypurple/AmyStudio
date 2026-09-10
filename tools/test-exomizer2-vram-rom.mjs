import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { Exomizer2Codec } from "../studio/vendor/retrocompress-lite/js/codecs/exomizer2.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-exomizer2-vram-"));
const sourcePath = path.join(temp, "exomizer2-vram.alexis");
const romPath = path.join(temp, "exomizer2-vram.rom");

let state = 0x6d2b79f5;
const raw = Buffer.alloc(6144);
for (let index = 0; index < raw.length; index += 1) {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  raw[index] = state & 0xff;
}
const packed = Buffer.from(await new Exomizer2Codec().compress(raw));
assert.ok(packed.length > raw.length, "Fixture must exercise Exomizer's incompressible-data fallback");

fs.writeFileSync(sourcePath, [
  'project "EXOMIZER2 VRAM SELFTEST"',
  'memory "colecovision_legacy_sdcc"',
  "bitmap screen",
  "nmi off",
  "decompress exomizer PackedData to vram.pattern",
  "screen on",
  "loop forever",
  amyData("PackedData", packed),
  ""
].join("\n"));

try {
  const profiles = process.env.AMY_EXOMIZER2_PROFILE
    ? [process.env.AMY_EXOMIZER2_PROFILE]
    : ["off", "safe", "balanced", "aggressive", "experimental"];
  for (const profile of profiles) {
    execFileSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      stdio: "pipe"
    });
    const core = await GearcolecoTestCore.create({ seed: 0x45584f32 });
    try {
      core.loadBios(fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom")));
      core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 180; frame += 1) core.runFrame();
      const actual = Buffer.from(core.readVram(0, raw.length));
      if (!actual.equals(raw)) {
        const first = actual.findIndex((value, index) => value !== raw[index]);
        assert.fail(`${profile}: VRAM mismatch at +$${first.toString(16)}: got $${actual[first].toString(16).padStart(2, "0")}, expected $${raw[first].toString(16).padStart(2, "0")}`);
      }
    } finally {
      core.destroy();
    }
    console.log(`Exomizer2 ${profile} VRAM ROM PASS (${fs.statSync(romPath).size} ROM bytes)`);
  }
  console.log(`Exomizer2 five-profile PASS (${packed.length} packed vs ${raw.length} raw bytes)`);
} finally {
  if (process.env.AMY_KEEP_TEMP) console.error(`Preserved Exomizer2 test files in ${temp}`);
  else fs.rmSync(temp, { recursive: true, force: true });
}

function amyData(name, bytes) {
  const rows = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    rows.push(`  ${[...bytes.subarray(offset, offset + 16)].map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",")}`);
  }
  return `data ${name} bytes\n${rows.join("\n")}\nend data`;
}
