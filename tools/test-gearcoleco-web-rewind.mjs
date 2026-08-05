import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const repoRoot = resolve(import.meta.dirname, "..");
const romArg = process.argv.indexOf("--rom");
if (romArg < 0 || !process.argv[romArg + 1]) {
  throw new Error("Usage: node tools/test-gearcoleco-web-rewind.mjs --rom path/to/test.rom");
}

const biosPath = process.env.AMY_COLECO_BIOS || resolve(repoRoot, "studio/bios/colecovision.rom");
const romPath = resolve(process.argv[romArg + 1]);
const [bios, rom] = await Promise.all([readFile(biosPath), readFile(romPath)]);

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function capture(core) {
  const framebuffer = core.getFramebuffer();
  return {
    state: hash(core.saveState()),
    framebuffer: hash(new Uint8Array(framebuffer.pixels.buffer)),
    vram: hash(core.readVram(0, 0x4000)),
    vdp: [...core.getVdpRegisters()]
  };
}

function runRecordedSegment(core) {
  for (let frame = 0; frame < 18; ++frame) {
    if (frame === 0) core.setControllerMask(0, 0);
    if (frame === 3) {
      core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_RIGHT);
    }
    if (frame === 5) core.setControllerMask(0, 0);
    core.runFrame();
  }
  return capture(core);
}

const core = await GearcolecoTestCore.create({ seed: 0x19770527 });
try {
  core.loadBios(bios);
  core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
  for (let frame = 0; frame < 8; ++frame) core.runFrame();

  core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_RIGHT);
  core.runFrame();
  const keyframe = core.saveState();
  const straight = runRecordedSegment(core);

  core.loadState(keyframe, {
    controllerMasks: [GEARCOLECO_TEST_INPUT.FIRE_RIGHT, 0]
  });
  const replayed = runRecordedSegment(core);

  if (JSON.stringify(straight) !== JSON.stringify(replayed)) {
    console.error("GearColeco web rewind/replay mismatch.");
    console.error({ straight, replayed });
    process.exit(1);
  }

  console.log("GearColeco web rewind/replay PASS");
  console.log(JSON.stringify(straight, null, 2));
} finally {
  core.destroy();
}

