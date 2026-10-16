#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-byte-iterator-"));
const sourceText = `project "BYTE ITERATOR"
memory "colecovision_legacy_sdcc"
u8 Values[4]
u8 Sum = 0
u8 MutatedSum = 0
u8 Iter = 0
u8 Passed = 0

sub SumValues:
  for each Value in Values
    Sum += Value
  next
end sub

sub MutatedIndex:
  for each Value, Iter in Values
    MutatedSum += Value
    if Iter = 0 then Iter = 2
  next
end sub

Values[0] = 1
Values[1] = 2
Values[2] = 4
Values[3] = 8
SumValues
MutatedIndex
if Sum = 15 and MutatedSum = 9 then Passed = 1
loop forever
`;

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing RAM symbol ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  const romSizes = new Map();
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const source = join(temp, `iterator-${profile}.alexis`);
    const asm = join(temp, `iterator-${profile}.asm`);
    const rom = join(temp, `iterator-${profile}.rom`);
    writeFileSync(source, sourceText);
    const result = spawnSync(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile} should compile:\n${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const sizeMatch = String(result.stdout || "").match(/ROM\s+(\d+)\s+bytes/i);
    assert.ok(sizeMatch, `${profile}: compiler should report the assembled ROM size`);
    romSizes.set(profile, Number.parseInt(sizeMatch[1], 10));
    const generated = readFileSync(asm, "utf8");
    assert.doesNotMatch(generated, /__amy_(?:end_)?array_iterator/i, `${profile}: internal iterator markers must not leak`);
    if (profile === "experimental") {
      const valuesAddress = addressOf(generated, "AMY_UVAR_Values");
      assert.match(generated, new RegExp(`ld ix,\\$${valuesAddress.toString(16).padStart(4, "0")}`, "i"),
        "experimental: array base should be loaded into IX once");
      assert.match(generated, /push ix\s*\n\s*pop hl\s*\n\s*ld a,\(hl\)/i,
        "experimental: array element loads should use the current pointer");
      assert.match(generated, /inc ix/i, "experimental: the pointer should advance with the loop");
      assert.equal((generated.match(/ld ix,\$[0-9a-f]{4}/gi) || []).length, 1,
        "experimental: mutating an explicit index must retain indexed lowering");
    }
    const core = await GearcolecoTestCore.create({ seed: 0x42595445 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_Sum"), 1)[0], 15, `${profile}: sum`);
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_MutatedSum"), 1)[0], 9, `${profile}: mutated-index fallback`);
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_Passed"), 1)[0], 1, `${profile}: result`);
    } finally {
      core.destroy();
    }
  }
  assert.ok(romSizes.get("experimental") < romSizes.get("off"),
    `experimental pointer loop should beat unoptimized code (${romSizes.get("experimental")} versus ${romSizes.get("off")})`);
  console.log(`Primitive for-each pointer codegen and ROM runtime PASS (5 profiles; ${romSizes.get("off")} -> ${romSizes.get("experimental")} bytes)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
