#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-word-reload-"));
const source = `
project "Word reload optimizer regression"
memory "colecovision_legacy_sdcc"
u16 Ni = 229
u16 Mi = 0
u8 Mb = 7
sub Probe:
  Mi = Ni >> 1
  Mb = Ni & 1
  return
end sub
Probe
loop forever
`;

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));
  const sourcePath = join(temp, "word-reload.alexis");
  writeFileSync(sourcePath, source);
  for (const profile of profiles) {
    const asmPath = join(temp, `word-reload-${profile}.asm`);
    const romPath = join(temp, `word-reload-${profile}.rom`);
    const result = spawnSync(process.execPath, [
      resolve(root, "tools/amyc.mjs"), sourcePath,
      "--asm", asmPath,
      "--rom", romPath,
      "--opt", profile
    ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x2E920261 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      assert.deepEqual([...core.readRam(addressOf(asm, "Mi"), 2)], [114, 0], `${profile}: shifted word`);
      assert.equal(core.readRam(addressOf(asm, "Mb"), 1)[0], 1, `${profile}: source word must be reloaded after shifting HL`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Optimizer word reload runtime: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
