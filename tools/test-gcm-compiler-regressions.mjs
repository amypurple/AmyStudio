#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-gcm-regressions-"));
const pointerSource = join(temp, "pointer.alexis");
const overflowSource = join(temp, "overflow.alexis");

writeFileSync(pointerSource, `u16 P = 0
u8 V = 0
  P = T[1]
  V = peek(P)
  loop forever
data Blk bytes 7,8,9
data T words
  @Blk, @Blk + 2
end data
`, "utf8");

writeFileSync(overflowSource, `u8 V = 0
  V = Big[0]
data Big bytes ${Array.from({ length: 33000 }, () => "$55").join(",")}
`, "utf8");

function compile(source, profile, output, asm = null, report = null) {
  const args = ["tools/amyc.mjs", source, "--opt", profile, "--output", output];
  if (asm) args.push("--asm", asm);
  if (report) args.push("--report-json", report);
  return spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing RAM address for ${name}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  for (const profile of profiles) {
    const rom = join(temp, `pointer-${profile}.rom`);
    const asmPath = join(temp, `pointer-${profile}.asm`);
    const build = compile(pointerSource, profile, rom, asmPath);
    assert.equal(build.status, 0, `${profile}: ${build.stdout}${build.stderr}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.match(asm, /dw\s+AMY_UDATA_Blk,AMY_UDATA_Blk\+2/i, `${profile}: missing offset pointer entry`);

    const core = await GearcolecoTestCore.create({ seed: 0x47434D });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 20; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "V"), 1)[0], 9, `${profile}: @Blk + 2 read wrong byte`);
    } finally {
      core.destroy();
    }
  }

  const overflowRom = join(temp, "overflow.rom");
  const overflowReport = join(temp, "overflow.json");
  const overflow = compile(overflowSource, "balanced", overflowRom, null, overflowReport);
  assert.equal(overflow.status, 1, `${overflow.stdout}${overflow.stderr}`);
  assert.match(overflow.stderr, /exceeds its 32 KiB mapped ROM window/i);
  assert.equal(existsSync(overflowRom), false, "overflowing ROM must not be written");
  assert.equal(JSON.parse(readFileSync(overflowReport, "utf8")).ok, false);
  console.log(`GCM compiler regressions: PASS (${profiles.length} pointer profiles + cartridge overflow)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
