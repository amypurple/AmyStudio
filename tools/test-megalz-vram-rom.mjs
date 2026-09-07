import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compressBytes, decompressBytes } from "../studio/core/compression.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-megalz-vram-"));
const sourcePath = path.join(temp, "megalz-vram.alexis");
const romPath = path.join(temp, "megalz-vram.rom");
const pattern = await rawWarriorTable("pattern");
const color = await rawWarriorTable("color");
const packedPattern = new Uint8Array(await compressBytes("megalz", pattern));
const packedColor = new Uint8Array(await compressBytes("megalz", color));

fs.writeFileSync(sourcePath, [
  'project "MEGALZ VRAM SELFTEST"',
  'memory "colecovision_legacy_sdcc"',
  "bitmap screen",
  "nmi off",
  "decompress megalz PackedPattern to vram.pattern",
  "decompress megalz PackedColor to vram.color",
  "screen on",
  "loop forever",
  amyData("PackedPattern", packedPattern),
  amyData("PackedColor", packedColor),
  ""
].join("\n"));

try {
  const profiles = process.env.AMY_MEGALZ_PROFILE
    ? [process.env.AMY_MEGALZ_PROFILE]
    : ["off", "safe", "balanced", "aggressive", "experimental"];
  for (const profile of profiles) {
    execFileSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      stdio: "pipe"
    });
    const core = await GearcolecoTestCore.create({ seed: 0x4d4c5a });
    try {
      core.loadBios(fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom")));
      core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 180; frame += 1) core.runFrame();
      assertVram(core, 0x0000, pattern, `${profile}: MegaLZ pattern`);
      assertVram(core, 0x2000, color, `${profile}: MegaLZ color`);
    } finally {
      core.destroy();
    }
    console.log(`MegaLZ ${profile} VRAM ROM PASS (${fs.statSync(romPath).size} ROM bytes)`);
  }
  console.log(`MegaLZ five-profile PASS (${packedPattern.length + packedColor.length} picture data bytes)`);
} finally {
  if (process.env.AMY_KEEP_TEMP) console.error(`Preserved MegaLZ test files in ${temp}`);
  else fs.rmSync(temp, { recursive: true, force: true });
}

async function rawWarriorTable(name) {
  const candidates = [
    ["zx0", path.join(root, "assets", "compressed", "warrior", `${name}.zx0`)],
    ["dan2", path.join(root, "assets", "compressed", "warrior", `${name}.dan2`)]
  ];
  const [codec, assetPath] = candidates.find(([, candidate]) => fs.existsSync(candidate)) || [];
  assert.ok(assetPath, `Missing Warrior ${name} fixture`);
  const raw = new Uint8Array(await decompressBytes(codec, fs.readFileSync(assetPath)));
  assert.equal(raw.length, 6144);
  return raw;
}

function amyData(name, bytes) {
  const rows = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    rows.push(`  ${[...bytes.subarray(offset, offset + 16)].map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",")}`);
  }
  return `data ${name} bytes\n${rows.join("\n")}\nend data`;
}

function assertVram(core, address, expected, label) {
  const actual = Buffer.from(core.readVram(address, expected.length));
  const wanted = Buffer.from(expected);
  if (actual.equals(wanted)) return;
  const first = actual.findIndex((value, index) => value !== wanted[index]);
  assert.fail(`${label} VRAM mismatch at +$${first.toString(16)}: got $${actual[first].toString(16).padStart(2, "0")}, expected $${wanted[first].toString(16).padStart(2, "0")}`);
}
