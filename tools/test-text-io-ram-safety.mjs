#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inferAmyMemoryCapabilities } from "../studio/core/compilerFrontend.js";
import { buildColecoLegacyRuntimeMap } from "../studio/ramLayouts.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const guardedSources = [
  "fill 32 count 2 at 3,3",
  "fill at 3,3 32 count 2",
  "put char 32 at 3,3",
  "Value = get char at 3,3",
  "screen on",
  "nmi on",
  'print at 0,0, "X"\nscreen on',
  "asm { call AMY_FILL_AT }",
  "asm { call AMY_RELEASE_VDP_GUARD }"
];

for (const source of guardedSources) {
  const capabilities = inferAmyMemoryCapabilities(source, () => false);
  assert.equal(capabilities.needsVdpStatusShadow, true, `${source}: VDP status RAM was not reserved`);
  assert.equal(capabilities.needsNmi, true, `${source}: NMI runtime RAM was not reserved`);
  const layout = buildColecoLegacyRuntimeMap(capabilities);
  assert.equal(layout.addresses.no_nmi, 0x7020, `${source}: NO_NMI moved unexpectedly`);
  assert.equal(layout.addresses.vdp_status, 0x7021, `${source}: VDP_STATUS moved unexpectedly`);
  assert.equal(layout.addresses.nmi_flag, 0x7022, `${source}: NMI_FLAG moved unexpectedly`);
  assert.ok(layout.userRamStart >= 0x7023, `${source}: user RAM overlaps the text/VDP guard`);
}

const unguarded = inferAmyMemoryCapabilities('print at 0,0, "X"', () => false);
assert.equal(unguarded.needsVdpStatusShadow, false,
  "direct literal print should not reserve the guard when it does not use the guarded helper");

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-text-io-ram-"));
const sourcePath = join(temp, "main.alexis");
writeFileSync(sourcePath, `u8 GuardA = 77
u8 GuardB = 88
tile screen
fill 65 count 2 at 0,1
loop forever
`);

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing RAM address for ${name}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, [
      "tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile
    ], { cwd: root, encoding: "utf8" });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);

    const asm = readFileSync(asmPath, "utf8");
    const guardA = addressOf(asm, "GuardA");
    const guardB = addressOf(asm, "GuardB");
    assert.ok(guardA >= 0x7023, `${profile}: GuardA overlaps VDP/NMI runtime state`);
    assert.ok(guardB >= 0x7023, `${profile}: GuardB overlaps VDP/NMI runtime state`);

    const core = await GearcolecoTestCore.create({ seed: 0x56445047 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 20; frame += 1) core.runFrame();
      assert.equal(core.readRam(guardA, 1)[0], 77, `${profile}: fill at clobbered GuardA`);
      assert.equal(core.readRam(guardB, 1)[0], 88, `${profile}: fill at clobbered GuardB`);
      assert.deepEqual([...core.readVram(0x1800 + 32, 2)], [65, 65], `${profile}: fill at output`);
    } finally {
      core.destroy();
    }
  }
  console.log("Text IO VDP-guard RAM safety: PASS (5 profiles)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
