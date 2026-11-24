import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";
import { UpkrCodec } from "../studio/vendor/retrocompress-lite/js/codecs/upkr.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-upkr-vram-"));
const sourcePath = path.join(temp, "upkr-vram.alexis");
const romPath = path.join(temp, "upkr-vram.rom");
const asmPath = path.join(temp, "upkr-vram.asm");

let state = 0x6d2b79f5;
const raw = Buffer.alloc(6144);
for (let index = 0; index < raw.length; index += 1) {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  raw[index] = state & 0xff;
}
const packed = Buffer.from(await new UpkrCodec().compress(raw));
assert.ok(packed.length > 0, "UPKR fixture did not produce a stream");

fs.writeFileSync(sourcePath, [
  'project "UPKR VRAM SELFTEST"',
  'memory "colecovision_legacy_sdcc"',
  "u8 GuardAfterUpkr = $5A",
  "bitmap screen",
  "nmi off",
  "decompress upkr PackedData to vram.pattern",
  "screen on",
  "loop forever",
  amyData("PackedData", packed),
  ""
].join("\n"));

try {
  const profiles = process.env.AMY_UPKR_PROFILE
    ? [process.env.AMY_UPKR_PROFILE]
    : ["off", "safe", "balanced", "aggressive", "experimental"];
  for (const profile of profiles) {
    execFileSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      stdio: "pipe"
    });
    const asm = fs.readFileSync(asmPath, "utf8");
    const tableMatch = asm.match(/^AMY_UPKR_PROBS\s+EQU\s+\$([0-9A-F]+)$/mi);
    const guardMatch = asm.match(/^AMY_UVAR_GuardAfterUpkr\s+EQU\s+\$([0-9A-F]+)$/mi);
    assert.ok(tableMatch, `${profile}: missing AMY_UPKR_PROBS`);
    assert.ok(guardMatch, `${profile}: missing GuardAfterUpkr address`);
    const tableAddress = Number.parseInt(tableMatch[1], 16);
    const guardAddress = Number.parseInt(guardMatch[1], 16);
    assert.equal(tableAddress & 0xff, 0, `${profile}: UPKR workspace must be 256-byte aligned`);
    assert.ok(guardAddress >= tableAddress + 322, `${profile}: user RAM overlaps UPKR workspace`);
    const core = await GearcolecoTestCore.create({ seed: 0x45584f32 });
    try {
      core.loadBios(fs.readFileSync(path.join(root, "studio", "bios", "colecovision.rom")));
      core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 720; frame += 1) core.runFrame();
      const actual = Buffer.from(core.readVram(0, raw.length));
      if (!actual.equals(raw)) {
        const first = actual.findIndex((value, index) => value !== raw[index]);
        assert.fail(`${profile}: VRAM mismatch at +$${first.toString(16)}: got $${actual[first].toString(16).padStart(2, "0")}, expected $${raw[first].toString(16).padStart(2, "0")}`);
      }
    } finally {
      core.destroy();
    }
    console.log(`UPKR ${profile} VRAM ROM PASS (${fs.statSync(romPath).size} ROM bytes)`);
  }
  console.log(`UPKR five-profile PASS (${packed.length} packed vs ${raw.length} raw bytes)`);
} finally {
  if (process.env.AMY_KEEP_TEMP) console.error(`Preserved UPKR test files in ${temp}`);
  else fs.rmSync(temp, { recursive: true, force: true });
}

function amyData(name, bytes) {
  const rows = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    rows.push(`  ${[...bytes.subarray(offset, offset + 16)].map((value) => `$${value.toString(16).padStart(2, "0")}`).join(",")}`);
  }
  return `data ${name} bytes\n${rows.join("\n")}\nend data`;
}
