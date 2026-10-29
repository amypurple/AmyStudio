#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-adjacent-if-flags-"));
const source = join(temp, "adjacent-if-flags.alexis");

writeFileSync(source, `
project "Adjacent IF flags"
memory "colecovision_legacy_sdcc"
u8 X = 10
u8 G = 20
u8 N = 0
sub Toward:
  if X < G then inc X
  if X > G then dec X
  return
end sub
for N = 1 to 15
  Toward
next
loop forever
`);

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, [
      resolve(root, "tools/amyc.mjs"), source,
      "--asm", asmPath,
      "--rom", romPath,
      "--opt", profile
    ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(build.status, 0, `${profile}: ${build.stdout}${build.stderr}`);

    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0xF1A65 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 30; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "X"), 1)[0], 20, `${profile}: adjacent IF result`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Adjacent IF comparison flags: PASS (${profiles.length} real ROM builds)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
