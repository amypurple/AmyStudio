#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `
u16 W = 300
u16 L = 232
u16 Overflow = 65530
i16 Negative = -20
i16 SignedBase = -30
u8 Result = 0
u8 Complete = 0

sub start:
  if W > L + 12 then Result |= 1
  if W > Overflow + 12 then Result |= 2
  if Negative > SignedBase + 5 then Result |= 4
  if SignedBase + 5 < Negative then Result |= 8
  Complete = 1
  loop forever
end sub
`;

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

const temp = mkdtempSync(join(tmpdir(), "amy-computed-word-compare-"));
try {
  const sourcePath = join(temp, "computed-word-compare.alexis");
  writeFileSync(sourcePath, source, "utf8");
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(build.status, 0, `${profile}: ${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.doesNotMatch(asm, /AMY_CMP_(?:LEFT|RIGHT)32/, `${profile}: native word comparison used 32-bit scratch RAM`);
    const core = await GearcolecoTestCore.create({ seed: 0x434D5032 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      const complete = addressOf(asm, "AMY_UVAR_Complete");
      for (let frame = 0; frame < 120 && core.readRam(complete, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(complete, 1)[0], 1, `${profile}: ROM did not complete`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Result"), 1)[0], 15,
        `${profile}: computed word comparison changed fixed-width or signed semantics`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Computed 16-bit comparisons: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
