import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = path.join(repo, "tools/fixtures/fujinet-appbank-project/project.amy.json");
const bios = readFileSync(path.join(repo, "studio/bios/colecovision.rom"));
const work = mkdtempSync(path.join(tmpdir(), "amy-fujinet-appbank-"));

try {
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const romPath = path.join(work, `${profile}.rom`);
    execFileSync(process.execPath, [path.join(repo, "tools/amyc.mjs"), manifest, "--opt", profile, "--output", romPath], { stdio: "pipe" });
    const rom = readFileSync(romPath);
    assert.equal(rom.length, 40 * 1024);
    const core = await GearcolecoTestCore.create({ seed: 0xA99B0000 + profile.length });
    try {
      core.loadBios(bios);
      core.setFujiNetEnabled(true);
      core.loadRom(rom);
      for (let frame = 0; frame < 120; ++frame) core.runFrame();
      assert.equal(core.readRam(0x7020, 1)[0], 0xA5, `${profile}: APPBANK page read`);
      assert.equal(core.getRomBank(), 1, `${profile}: selected logical page`);
    } finally { core.destroy(); }
  }
} finally { rmSync(work, { recursive: true, force: true }); }

console.log("FujiNet APPBANK multifile CLI runtime: PASS (5 profiles)");
