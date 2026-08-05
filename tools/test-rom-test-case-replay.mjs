import { createHash, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";
import { createRomTestCase } from "../studio/core/romTestCase.js";
import { replayRomTestCase } from "../studio/core/romTestCaseRunner.js";

globalThis.crypto ||= webcrypto;
const repoRoot = resolve(import.meta.dirname, "..");
const [bios, rom, symbols] = await Promise.all([
  readFile(process.env.AMY_COLECO_BIOS || resolve(repoRoot, "studio/bios/colecovision.rom")),
  readFile(resolve(
    repoRoot,
    "build/rom-tests/warrior-dan2-fire-visual-test.rom"
  )),
  readFile(resolve(
    repoRoot,
    "build/rom-tests/warrior-dan2-fire-visual-test.sym"
  ), "utf8")
]);

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const seed = 0xA5A55A5A;
const captureCore = await GearcolecoTestCore.create({ seed });
let testCase;
try {
  captureCore.loadBios(bios);
  captureCore.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  const addressLine = symbols.split(/\r?\n/).find((line) => {
    return line.endsWith(" AMY_ULBL_TEST_warrior_prompt");
  });
  const address = Number.parseInt(addressLine.slice(3, 7), 16);
  captureCore.setExecuteBreakpoint(address);
  const inputs = [];
  for (let index = 0; index < 30; ++index) {
    inputs.push({ controllerMasks: [0, 0], spinnerDeltas: [0, 0] });
    if (captureCore.runFrame().breakpointHit) break;
  }
  const framebuffer = captureCore.getFramebuffer();
  testCase = createRomTestCase({
    name: "Warrior prompt replay",
    projectName: "warrior-dan2-fire-visual-test",
    seed,
    biosSha256: hash(bios),
    romSha256: hash(rom),
    inputs,
    checkpoint: { name: "warrior_prompt", occurrence: 1 },
    assertions: {
      framebufferSha256: hash(new Uint8Array(framebuffer.pixels.buffer)),
      vramSha256: hash(captureCore.readVram(0, 0x4000)),
      vdpRegisters: [...captureCore.getVdpRegisters()]
    }
  });
} finally {
  captureCore.destroy();
}

const replayCore = await GearcolecoTestCore.create({ seed });
try {
  replayCore.loadBios(bios);
  replayCore.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  const result = await replayRomTestCase(replayCore, testCase, {
    biosBytes: bios,
    romBytes: rom,
    symbolsText: symbols
  });
  if (!result.pass) throw new Error("ROM test replay did not pass.");
  console.log("ROM test case real replay PASS");
  console.log(JSON.stringify(result, null, 2));
} finally {
  replayCore.destroy();
}

