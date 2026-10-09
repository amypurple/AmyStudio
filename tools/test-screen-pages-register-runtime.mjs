#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-screen-pages-register-"));
const source = join(temp, "screen-pages-register.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

writeFileSync(source, `project "SCREEN PAGES REGISTER TEST"
memory "colecovision_legacy_sdcc"

sub start:
  tile screen
  set screen pages vram.name and vram $1C00
  set screen pages vram $1C00 and vram.name
  loop forever
end sub
`);

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `screen-pages-register-${profile}.asm`);
    const romPath = join(temp, `screen-pages-register-${profile}.rom`);
    const result = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), source,
      "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x50414745 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_SCREEN_VIEW_POINTER"), 2)], [0x00, 0x1C],
        `${profile}: viewed page pointer`);
      assert.deepEqual([...core.readRam(0x73F6, 2)], [0x00, 0x18], `${profile}: edit page pointer`);
      assert.equal(core.getVdpRegisters()[2], 0x07, `${profile}: visible name-table register`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Screen pages register runtime: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
