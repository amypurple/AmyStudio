import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const repoRoot = resolve(import.meta.dirname, "..");
const baselinePath = resolve(
  repoRoot,
  "tools/rom-baselines/warrior-dan2-fire-prompt.json"
);
const [bios, rom, symbols, baseline] = await Promise.all([
  readFile(process.env.AMY_COLECO_BIOS || resolve(repoRoot, "studio/bios/colecovision.rom")),
  readFile(resolve(
    repoRoot,
    "build/rom-tests/warrior-dan2-fire-visual-test.rom"
  )),
  readFile(resolve(
    repoRoot,
    "build/rom-tests/warrior-dan2-fire-visual-test.sym"
  ), "utf8"),
  readFile(baselinePath, "utf8").then(JSON.parse)
]);

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const symbol = "AMY_ULBL_TEST_warrior_prompt";
const line = symbols.split(/\r?\n/).find((value) => value.endsWith(` ${symbol}`));
if (!line) throw new Error(`Missing checkpoint symbol ${symbol}.`);
const address = Number.parseInt(line.slice(3, 7), 16);

const core = await GearcolecoTestCore.create({ seed: 0xA5A55A5A });
try {
  core.loadBios(bios);
  core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  core.setExecuteBreakpoint(address);
  let result = null;
  for (let frame = 0; frame < 30; ++frame) {
    result = core.runFrame();
    if (result.breakpointHit) break;
  }
  assert.equal(result?.breakpointHit, true);
  assert.equal(result.pc, address);
  assert.equal(hash(core.readVram(0, 0x4000)), baseline.vramSha256);
  assert.deepEqual(
    [...core.getVdpRegisters()],
    baseline.vdpRegisters.map((entry) => Number.parseInt(entry[1], 16))
  );

  console.log("GearColeco desktop/WASM VRAM+VDP parity PASS");
  console.log(JSON.stringify({
    checkpoint: symbol,
    address,
    vramSha256: baseline.vramSha256,
    vdpRegisters: [...core.getVdpRegisters()]
  }, null, 2));
} finally {
  core.destroy();
}

