#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-ldi-a-liveness-"));
const source = join(temp, "ldi-a-liveness.alexis");

writeFileSync(source, `
project "LDI accumulator liveness"
u8 Src[4]
u8 Dst[4]
u8 Done = 0
Src[0] = 65
Src[1] = 0
asm {
  ld hl,AMY_UVAR_Src
  ld de,AMY_UVAR_Dst
  ld a,7
CopyLoop:
  ld a,(hl)
  ld (de),a
  inc hl
  inc de
  or a
  jr nz,CopyLoop
}
Done = 1
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
    if (["balanced", "aggressive", "experimental"].includes(profile)) {
      assert.doesNotMatch(asm, /CopyLoop:\s*\n\s*ldi\b/i, `${profile}: unsafe LDI fold returned`);
    }

    const core = await GearcolecoTestCore.create({ seed: 0x1D10A });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.deepEqual([...core.readRam(addressOf(asm, "Dst"), 2)], [65, 0], `${profile}: copied bytes`);
      assert.equal(core.readRam(addressOf(asm, "Done"), 1)[0], 1, `${profile}: copy terminated`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Optimizer LDI accumulator runtime: PASS (${profiles.length} real ROM builds)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
