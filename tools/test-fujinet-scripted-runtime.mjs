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
  for (let frame = 0; frame < 240; frame += 1) {
    core.runFrame();
    if (core.getFujiNetTrace().filter(entry => entry.direction === "tx").length >= 2) break;
  }
  assert.equal(core.readRam(openedAddress, 1)[0], 1, "OPEN transaction completed through the scripted mapper");
  const trace = core.getFujiNetTrace().filter(entry => entry.direction === "tx");
  assert.equal(trace.length, 2, "OPEN and READ reached the JavaScript server");
  assert.equal(trace[0].device, 0x71);
  assert.equal(trace[0].command, 0x4F);
  assert.equal(trace[0].payload.length, 260, "size-prefixed OPEN parameters and padded URL were preserved");
  assert.equal(trace[1].command, 0x52);
  assert.deepEqual(Array.from(trace[1].payload), [0x02, 0x23, 0x01], "FN_PARAM16 preserves the high byte on the wire");
  console.log("FujiNet scripted runtime: pass");
} finally {
  core.destroy();
  rmSync(output, { recursive: true, force: true });
}
