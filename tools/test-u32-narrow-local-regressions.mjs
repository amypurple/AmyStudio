#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-u32-narrow-local-"));
const source = join(temp, "main.alexis");

writeFileSync(source, `project "u32 narrow and local regressions"
memory "colecovision_legacy_sdcc"
u32 Ut = 1000
u8 G8 = 5
u16 G16 = 7
u32 Product = 0
u32 Sum = 0
u32 Difference = 0
u32 Quotient = 0
u8 LocalCompare = 0

sub CheckLocals:
  u32 A = 10
  u32 B = 5
  if A > B then LocalCompare = 1
  return
end sub

  Product = Ut * G8
  Sum = Ut + G16
  Difference = Ut - G8
  Quotient = Ut / G8
  CheckLocals()
  loop forever
`);

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "mi"));
  assert.ok(match, `missing ${name} symbol`);
  return Number.parseInt(match[1], 16);
}

function readU32(core, address) {
  const bytes = core.readRam(address, 4);
  return (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
}

try {
  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, [
      "tools/amyc.mjs", source, "--asm", asmPath, "--rom", romPath, "--opt", profile
    ], { cwd: root, encoding: "utf8" });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.doesNotMatch(asm, /\bundefined\b/i, `${profile}: undefined leaked into assembly`);
    const core = await GearcolecoTestCore.create({ seed: 0x5533324C });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      assert.equal(readU32(core, addressOf(asm, "Product")), 5000, `${profile}: u32 * u8`);
      assert.equal(readU32(core, addressOf(asm, "Sum")), 1007, `${profile}: u32 + u16`);
      assert.equal(readU32(core, addressOf(asm, "Difference")), 995, `${profile}: u32 - u8`);
      assert.equal(readU32(core, addressOf(asm, "Quotient")), 200, `${profile}: u32 / u8`);
      assert.equal(core.readRam(addressOf(asm, "LocalCompare"), 1)[0], 1, `${profile}: local u32 comparison`);
    } finally {
      core.destroy();
    }
  }

  const reservedSource = join(temp, "reserved.alexis");
  writeFileSync(reservedSource, `project "reserved function name"
function Sgn(i16 V) as i16
  return V
end sub
`);
  const reservedBuild = spawnSync(process.execPath, ["tools/amyc.mjs", reservedSource, "--opt", "balanced"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.notEqual(reservedBuild.status, 0, "reserved builtin function name unexpectedly compiled");
  assert.match(`${reservedBuild.stdout || ""}${reservedBuild.stderr || ""}`, /Function name 'Sgn'.*reserved Amy builtin/i);
  console.log(`u32 narrow/local regressions: PASS (${profiles.length} profiles + reserved diagnostic)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
