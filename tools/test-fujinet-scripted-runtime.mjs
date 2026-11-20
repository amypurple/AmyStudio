import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const output = mkdtempSync(resolve(tmpdir(), "amy-fujinet-scripted-"));
const romPath = resolve(output, "scripted.rom");
const symbolsPath = resolve(output, "scripted.sym");
execFileSync(process.execPath, [
  resolve(root, "tools/amyc.mjs"),
  resolve(root, "test/fixtures/fujinet-scripted-network.alexis"),
  "--target", "colecovision-fujinet",
  "--opt", "balanced",
  "--output", romPath,
  "--symbols", symbolsPath,
], { cwd: root, stdio: "pipe" });
const openedMatch = readFileSync(symbolsPath, "utf8").match(/^AMY_UVAR_Opened:\s+equ \$([0-9A-F]+)$/mi);
assert.ok(openedMatch, "Opened symbol is present");
const openedAddress = Number.parseInt(openedMatch[1], 16);
const core = await GearcolecoTestCore.create({ seed: 0x46554A49 });
try {
  core.setFujiNetEnabled(true);
  core.setFujiNetTestProfile("loopback");
  core.loadBios(readFileSync(resolve(root, "studio/bios/colecovision.rom")));
  core.loadRom(readFileSync(romPath));
  for (let frame = 0; frame < 240 && core.readRam(openedAddress, 1)[0] !== 1; frame += 1) core.runFrame();
  assert.equal(core.readRam(openedAddress, 1)[0], 1, "OPEN transaction completed through the scripted mapper");
  const trace = core.getFujiNetTrace();
  assert.equal(trace.length, 1, "one OPEN request reached the JavaScript server");
  assert.equal(trace[0].device, 0x71);
  assert.equal(trace[0].command, 0x4F);
  assert.equal(trace[0].payload.length, 260, "size-prefixed OPEN parameters and padded URL were preserved");
  console.log("FujiNet scripted runtime: pass");
} finally {
  core.destroy();
  rmSync(output, { recursive: true, force: true });
}
