#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-array-read-"));
const sourceText = `project "REPEATED ARRAY READ"
memory "colecovision_legacy_sdcc"
u8 Values[2]
u8 Others[2]
u8 Index = 0
u8 Match = 0

Values[0] = 4
Others[0] = 4
if Values[Index] = 2 or Values[Index] = 4 then Match += 1
if Values[Index] = 2 or Others[Index] = 4 then Match += 1
loop forever
`;

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing RAM symbol ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  const sizes = new Map();
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const source = join(temp, `array-read-${profile}.alexis`);
    const asm = join(temp, `array-read-${profile}.asm`);
    const rom = join(temp, `array-read-${profile}.rom`);
    writeFileSync(source, sourceText);
    const result = spawnSync(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile} should compile:\n${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const sizeMatch = String(result.stdout || "").match(/ROM\s+(\d+)\s+bytes/i);
    assert.ok(sizeMatch, `${profile}: compiler should report ROM size`);
    sizes.set(profile, Number.parseInt(sizeMatch[1], 10));
    const generated = readFileSync(asm, "utf8");
    if (profile === "experimental") {
      const valuesAddress = addressOf(generated, "AMY_UVAR_Values");
      const othersAddress = addressOf(generated, "AMY_UVAR_Others");
      const countLoads = (address) => (generated.match(new RegExp(`ld hl,\\$${address.toString(16).padStart(4, "0")}`, "gi")) || []).length;
      assert.equal(countLoads(valuesAddress), 3, "experimental: identical OR terms share one Values read, unlike the different-array case");
      assert.equal(countLoads(othersAddress), 2, "experimental: a different array must still be read");
    }
    const core = await GearcolecoTestCore.create({ seed: 0x43534531 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_Match"), 1)[0], 2, `${profile}: compound-condition result`);
    } finally {
      core.destroy();
    }
  }
  assert.ok(sizes.get("experimental") <= sizes.get("balanced"),
    `experimental repeated-read reuse must not grow ROM (${sizes.get("balanced")} -> ${sizes.get("experimental")})`);
  console.log(`Repeated array-read codegen and ROM runtime PASS (5 profiles; balanced ${sizes.get("balanced")} -> experimental ${sizes.get("experimental")} bytes)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
