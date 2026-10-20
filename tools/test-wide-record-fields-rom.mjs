#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-wide-record-fields-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = join(temp, "wide-record-fields.alexis");

writeFileSync(source, `project "wide record field ROM test"
memory "colecovision_legacy_sdcc"
record WideRecord:
  u32 Block
  i32 Delta
end record
WideRecord First
WideRecord Second
u32 BlockCopy = 0
i32 DeltaCopy = 0
sub start:
  First.Block = $12345678
  First.Delta = -1234567
  BlockCopy = First.Block
  DeltaCopy = First.Delta
  Second.Block = BlockCopy
  Second.Delta = DeltaCopy
  loop forever
end sub
`);

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

function readU32(core, address) {
  const bytes = core.readRam(address, 4);
  return (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `wide-record-${profile}.asm`);
    const romPath = join(temp, `wide-record-${profile}.rom`);
    const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}`);
    const asm = readFileSync(asmPath, "utf8");
    const first = addressOf(asm, "AMY_UVAR_First");
    const second = addressOf(asm, "AMY_UVAR_Second");
    const blockCopy = addressOf(asm, "AMY_UVAR_BlockCopy");
    const deltaCopy = addressOf(asm, "AMY_UVAR_DeltaCopy");
    const core = await GearcolecoTestCore.create({ seed: 0x57524432 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      assert.equal(readU32(core, first), 0x12345678, `${profile}: u32 literal to record field`);
      assert.equal(readU32(core, first + 4), (-1234567) >>> 0, `${profile}: i32 literal to record field`);
      assert.equal(readU32(core, blockCopy), 0x12345678, `${profile}: u32 record field to scalar`);
      assert.equal(readU32(core, deltaCopy), (-1234567) >>> 0, `${profile}: i32 record field to scalar`);
      assert.equal(readU32(core, second), 0x12345678, `${profile}: u32 scalar to record field`);
      assert.equal(readU32(core, second + 4), (-1234567) >>> 0, `${profile}: i32 scalar to record field`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Wide record fields ROM: PASS (${profiles.length} profiles, u32/i32 round trips)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
