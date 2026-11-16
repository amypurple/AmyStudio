import { readFileSync } from "node:fs";
import { basename } from "node:path";

import { GearcolecoTestCore } from "../studio/core/gearcolecoTestCore.js";

const [beforePath, afterPath, frameText = "2400"] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  throw new Error("Usage: node tools/compare-vdp-timing-rom-pair.mjs before.rom after.rom [frames]");
}
const frames = Number.parseInt(frameText, 10);
if (!Number.isInteger(frames) || frames <= 0) throw new Error("Frames must be a positive integer.");
const bios = readFileSync(new URL("../studio/bios/colecovision.rom", import.meta.url));

async function measure(path) {
  const core = await GearcolecoTestCore.create({ seed: 0x56445050 });
  try {
    core.setVideoChip("tms9918a");
    core.setAccurateVdpTiming(true);
    core.loadBios(bios);
    core.loadRom(readFileSync(path));
    for (let frame = 0; frame < frames; frame++) core.runFrame();
    return { rom: basename(path), frames, droppedRequests: core.getDroppedVramAccesses() };
  } finally {
    core.destroy();
  }
}

console.table([await measure(beforePath), await measure(afterPath)]);
