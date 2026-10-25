#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-for-down-step-"));
const sourceText = `project "FOR CONSTANT DOWN STEP"
memory "colecovision_legacy_sdcc"
const THREE = 3
u8 U = 0
u8 Count1 = 0
u8 Count3 = 0
u8 DynamicCount = 0
u8 StepValue = 2
i8 S = 0
i8 SignedSum = 0
u8 Passed = 0

for U = 7 to 0 step -1
  Count1 += 1
next
for U = 9 downto 0 step THREE
  Count3 += 1
next
for U = 6 downto 0 step StepValue
  DynamicCount += 1
next
for S = 3 to -3 step -2
  SignedSum += S
next
if Count1 = 8 and Count3 = 4 and DynamicCount = 4 and SignedSum = 0 then Passed = 1
loop forever
`;

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing RAM symbol ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const source = join(temp, `for-down-${profile}.alexis`);
    const asm = join(temp, `for-down-${profile}.asm`);
    const rom = join(temp, `for-down-${profile}.rom`);
    writeFileSync(source, sourceText);
    const result = spawnSync(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile} should compile:\n${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
    const generated = readFileSync(asm, "utf8");
    assert.match(generated, /sub 1/i, `${profile}: literal constant step should use immediate subtraction`);
    assert.match(generated, /sub 3/i, `${profile}: named constant step should use immediate subtraction`);
    assert.match(generated, /sub 2/i, `${profile}: signed constant step should use immediate subtraction`);
    assert.match(generated, /sub c/i, `${profile}: runtime step must retain the register-based fallback`);

    const core = await GearcolecoTestCore.create({ seed: 0x464f5231 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(rom), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_Count1"), 1)[0], 8, `${profile}: step 1 count`);
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_Count3"), 1)[0], 4, `${profile}: named step count`);
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_DynamicCount"), 1)[0], 4, `${profile}: dynamic step count`);
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_SignedSum"), 1)[0], 0, `${profile}: signed step sum`);
      assert.equal(core.readRam(addressOf(generated, "AMY_UVAR_Passed"), 1)[0], 1, `${profile}: aggregate result`);
    } finally {
      core.destroy();
    }
  }
  console.log("Constant byte FOR down-step codegen and ROM runtime PASS (5 profiles)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
