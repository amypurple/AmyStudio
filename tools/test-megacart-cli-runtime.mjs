#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-megacart-cli-"));
const source = `
project "MegaCart CLI runtime"
memory "colecovision-megacart"
u8 Done = 0
Done = 77
loop forever
`;

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));
  const sourcePath = join(temp, "case.alexis");
  writeFileSync(sourcePath, source);
  for (const profile of profiles) {
    const asmPath = join(temp, `case-${profile}.asm`);
    const romPath = join(temp, `case-${profile}.rom`);
    const result = spawnSync(process.execPath, [
      resolve(root, "tools/amyc.mjs"), sourcePath,
      "--target", "colecovision-megacart",
      "--memory-profile", "colecovision-megacart",
      "--asm", asmPath, "--rom", romPath, "--opt", profile
    ], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const rom = readFileSync(romPath);
    assert.equal(rom.length, 128 * 1024, `${profile}: MegaCart image size`);
    assert.deepEqual([...rom.subarray(7 * 16384, 7 * 16384 + 2)], [0x55, 0xAA], `${profile}: fixed-bank header`);
    const core = await GearcolecoTestCore.create({ seed: 0x4D434C49 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      assert.equal(core.isMegaCart(), true, `${profile}: emulator did not detect MegaCart`);
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "Done"), 1)[0], 77, `${profile}: fixed bank did not execute`);
    } finally {
      core.destroy();
    }
  }
  console.log(`MegaCart CLI runtime: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
