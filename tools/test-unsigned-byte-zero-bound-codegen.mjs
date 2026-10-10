#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `u8 Value = 0
bool Flag = false
i8 SignedValue = 0
u8 Failures = 0
Value = 0
if Value > 0 then Failures += 1
if Value <= 0 then Failures += 0 else Failures += 1
if 0 < Value then Failures += 1
if 0 >= Value then Failures += 0 else Failures += 1
Value = 255
if Value > 0 then Failures += 0 else Failures += 1
if Value <= 0 then Failures += 1
if 0 < Value then Failures += 0 else Failures += 1
if 0 >= Value then Failures += 1
Flag = false
if Flag > 0 then Failures += 1
Flag = true
if Flag > 0 then Failures += 0 else Failures += 1
SignedValue = -1
if SignedValue > 0 then Failures += 1
SignedValue = 1
if SignedValue > 0 then Failures += 0 else Failures += 1
loop forever
`;

const output = mkdtempSync(join(tmpdir(), "amy-u8-zero-bound-"));
try {
  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  for (const profile of profiles) {
    const sourcePath = join(output, `${profile}.alexis`);
    const asmPath = join(output, `${profile}.asm`);
    const romPath = join(output, `${profile}.rom`);
    writeFileSync(sourcePath, source);
    const compile = spawnSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(compile.status, 0, `${profile} compile failed:\n${compile.stdout || ""}${compile.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    const rom = readFileSync(romPath);
    assert.match(asm, /ld a,\(AMY_UVAR_Value\)\s+or a\s+jp (?:z|nz),/i, `${profile}: missing unsigned specialization`);
    assert.doesNotMatch(asm, /ld a,\(AMY_UVAR_Value\)\s+cp (?:0|\$0+)\b/i, `${profile}: retained unsigned CP 0`);
    assert.match(asm, /AMY_UVAR_SignedValue[\s\S]*?jp m,/i, `${profile}: signed comparison lost its sign test`);
    const failureMatch = asm.match(/^AMY_UVAR_Failures\s+EQU\s+\$([0-9A-Fa-f]+)/m);
    assert.ok(failureMatch, `${profile}: missing Failures symbol`);
    const core = await GearcolecoTestCore.create({ seed: 0x553800 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 5; frame += 1) core.runFrame();
      assert.equal(core.readRam(Number.parseInt(failureMatch[1], 16), 1)[0], 0, `${profile}: comparison changed`);
    } finally {
      core.destroy();
    }
  }
  console.log("Unsigned byte zero-bound specialization PASS (5 profiles, runtime checked)");
} finally {
  rmSync(output, { recursive: true, force: true });
}
