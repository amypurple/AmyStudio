#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-megacart-project-cli-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

try {
  writeFileSync(join(temp, "main.amy"), [
    'project "MegaCart CLI project runtime"',
    'memory "colecovision-megacart"',
    "bank rom 64",
    "call bank 1, MarkBankOne",
    "call bank 2, MarkBankTwo",
    "loop forever",
    ""
  ].join("\n"));
  writeFileSync(join(temp, "bank1.asm"), [
    "org $C000",
    "AMY_UPROC_MarkBankOne:",
    "  ld a,$31",
    "  ld ($73B1),a",
    "  ret",
    ""
  ].join("\n"));
  const assetBytes = Buffer.from([0x41, 0x53, 0x53, 0x45, 0x54, 0x2D, 0x42, 0x41, 0x4E, 0x4B, 0x2D, 0x33]);
  writeFileSync(join(temp, "bank3.bin"), assetBytes);
  writeFileSync(join(temp, "bank2.amy"), [
    "sub MarkBankTwo:",
    "  asm {",
    "    ld a,$4D",
    "    ld ($73B0),a",
    "  }",
    "  return",
    "end sub",
    ""
  ].join("\n"));
  writeFileSync(join(temp, "project.amy.json"), JSON.stringify({
    version: 2,
    projectName: "MegaCart CLI project runtime",
    target: { platform: "colecovision-megacart", romSizeKb: 64 },
    outputs: [
      { name: "FIXED", type: "fixed-bank", sources: [{ path: "main.amy", kind: "amy" }] },
      { name: "BANK1", type: "switchable-bank", bank: 1, exports: ["MarkBankOne"], sources: [{ path: "bank1.asm", kind: "asm" }] },
      { name: "BANK2", type: "switchable-bank", bank: 2, exports: ["MarkBankTwo"], sources: [{ path: "bank2.amy", kind: "amy" }] },
      { name: "BANK3", type: "switchable-bank", bank: 3, sources: [{ path: "bank3.bin", kind: "asset" }] }
    ]
  }, null, 2));

  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  for (const profile of profiles) {
    const romPath = join(temp, `project-${profile}.rom`);
    const args = [
      join(root, "tools", "amyc.mjs"), join(temp, "project.amy.json"),
      "--output", romPath, "--opt", profile
    ];
    if (profile === "balanced") args.push("--asm", join(temp, "fixed.asm"), "--optimized-asm", join(temp, "fixed.opt.asm"), "--symbols", join(temp, "project.sym"));
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || result.error || ""}${result.stdout || ""}${result.stderr || ""}`);
    const rom = readFileSync(romPath);
    assert.equal(rom.length, 64 * 1024, `${profile}: project ROM size`);
    assert.deepEqual(rom.subarray(2 * 16 * 1024, 2 * 16 * 1024 + assetBytes.length), assetBytes, `${profile}: bank 3 asset bytes`);
    if (profile === "balanced") {
      assert.equal(existsSync(join(temp, "fixed.asm")), true, "linked fixed-bank ASM was not written");
      assert.equal(existsSync(join(temp, "fixed.opt.asm")), true, "optimized fixed-bank ASM was not written");
      assert.match(readFileSync(join(temp, "project.sym"), "utf8"), /01:C000 AMY_UPROC_MarkBankOne/i, "bank-qualified ASM symbol missing");
      assert.match(readFileSync(join(temp, "project.sym"), "utf8"), /02:C000 AMY_UPROC_MarkBankTwo/i, "bank-qualified Amy symbol missing");
    }
    const core = await GearcolecoTestCore.create({ seed: 0x4D435052 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      assert.equal(core.isMegaCart(), true, `${profile}: emulator did not detect MegaCart`);
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      assert.equal(core.readRam(0x73B1, 1)[0], 0x31, `${profile}: fixed bank did not call bank 1 ASM procedure`);
      assert.equal(core.readRam(0x73B0, 1)[0], 0x4D, `${profile}: fixed bank did not call bank 2 Amy procedure`);
      assert.equal(core.getRomBank(), 0, `${profile}: trampoline did not restore the original bank`);
    } finally {
      core.destroy();
    }
  }
  console.log("MegaCart multifile CLI project runtime: PASS (Amy + ASM + asset banks, 5 profiles)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
