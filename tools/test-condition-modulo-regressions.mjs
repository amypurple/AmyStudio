#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-condition-modulo-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = join(temp, "condition-modulo.alexis");

writeFileSync(source, `project "CONDITION MODULO REGRESSIONS"
memory "colecovision_legacy_sdcc"
i8 SignedValue = -7
u8 Bound = 7
u8 X = 5
u8 Y = 6
u8 A = 37
u8 B = 14
u8 AbsResult = 0
u8 CharResult = 0
u8 ModWord = 0
u8 ModSymbol = 0
u8 Done = 0

sub start:
  tile screen
  nmi off
  put char 65 at X,Y
  if abs(SignedValue) <= Bound then AbsResult = 1
  if get char at X,Y <> 32 then CharResult = 1
  ModWord = (A * B) mod 50
  ModSymbol = (A * B) % 50
  Done = 1
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
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const result = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || result.error || ""}${result.stdout || ""}${result.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x4D4F4435 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const done = addressOf(asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 30 && core.readRam(done, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(done, 1)[0], 1, `${profile}: completion marker`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_AbsResult"), 1)[0], 1, `${profile}: abs comparison`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_CharResult"), 1)[0], 1, `${profile}: get-char comparison`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_ModWord"), 1)[0], 18, `${profile}: mod keyword preserves product width`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_ModSymbol"), 1)[0], 18, `${profile}: percent operator preserves product width`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Condition/modulo regressions: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
