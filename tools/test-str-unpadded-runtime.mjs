#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-str-unpadded-"));
const source = join(temp, "str-unpadded.alexis");

writeFileSync(source, `project "STR UNPADDED TEST"
memory "colecovision_legacy_sdcc"
u16 W = 20
u8 B = 7
i16 N = -42
u8 Line[7]
tile screen
Line = "A" + str$(W) + "B"
print at 2,4, "A" + str$(W) + "B"
print at 2,5, "A" + str$(B) + "B"
print at 2,6, "A" + str$(N) + "B"
print at 2,7, str$(W)
print at 2,8, "A" + digits$(W, 5) + "B"
print at 2,9, "A" + width$(W, 5) + "B"
loop forever
`);

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing RAM address for ${name}`);
  return Number.parseInt(match[1], 16);
}

function text(core, x, y, length) {
  return String.fromCharCode(...core.readVram(0x1800 + y * 32 + x, length));
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
    const core = await GearcolecoTestCore.create({ seed: 0x53545224 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 45; frame += 1) core.runFrame();
      assert.equal(text(core, 2, 4, 7), "A20B   ", `${profile}: concatenated u16 str$`);
      assert.equal(text(core, 2, 5, 5), "A7B  ", `${profile}: concatenated u8 str$`);
      assert.equal(text(core, 2, 6, 8), "A-42B   ", `${profile}: concatenated i16 str$`);
      assert.equal(text(core, 2, 7, 5), "20   ", `${profile}: direct u16 str$`);
      assert.equal(text(core, 2, 8, 7), "A00020B", `${profile}: digits$ remains padded`);
      assert.equal(text(core, 2, 9, 7), "A   20B", `${profile}: width$ remains aligned`);
      assert.equal(
        String.fromCharCode(...core.readRam(addressOf(asm, "Line"), 7)),
        "A20B   ",
        `${profile}: buffer concatenation`
      );
    } finally {
      core.destroy();
    }
  }
  console.log(`Unpadded str$ runtime: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
