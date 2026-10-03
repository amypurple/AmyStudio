#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GearcolecoTestCore,
  GEARCOLECO_ADAM_MEDIA,
  GEARCOLECO_ADAM_SLOT
} from "../studio/core/gearcolecoTestCore.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultDisk = "C:/Users/Amy/Downloads/Chess Champ (1988) (Digital Express Inc.) [ExpRAM].dsk";
const diskPath = path.resolve(process.argv[2] || defaultDisk);
assert.ok(fs.existsSync(diskPath), `Chess Champ compatibility fixture not found: ${diskPath}`);

const firmwareCandidates = [
  process.argv[3],
  process.env.ADAM_FIRMWARE_DIR,
  path.join(root, "firmware", "adam"),
  "C:/Users/Amy/Desktop/ALEXIS-Z80/2005 mes documents/daniel bienvenu (2)/coleco4k/coleco"
].filter(Boolean);
const firmwareRoot = firmwareCandidates.find((candidate) =>
  ["OS7.ROM", "EOS.ROM", "WP.ROM"].every((name) => fs.existsSync(path.join(candidate, name)))
);
assert.ok(firmwareRoot,
  "ADAM firmware not found; set ADAM_FIRMWARE_DIR or pass the firmware directory as the second argument");
const core = await GearcolecoTestCore.create({ seed: 0xC4E55 });

try {
  core.loadAdamFirmware({
    os7: fs.readFileSync(path.join(firmwareRoot, "OS7.ROM")),
    eos: fs.readFileSync(path.join(firmwareRoot, "EOS.ROM")),
    smartwriter: fs.readFileSync(path.join(firmwareRoot, "WP.ROM"))
  });
  core.startAdam();
  core.loadAdamMedia(fs.readFileSync(diskPath), {
    slot: GEARCOLECO_ADAM_SLOT.DISK_1,
    type: GEARCOLECO_ADAM_MEDIA.DISK,
    writeProtected: true
  });
  core.reset();

  runToFrame(120);
  assert.deepEqual([...core.getVdpRegisters()], [0x00, 0xE0, 0x02, 0x2C, 0x00, 0x00, 0x00, 0x0E]);
  assert.equal(core.readVram(0x0000, 1)[0], 0xD0,
    "ADAM startup compatibility did not terminate the overlapping sprite list");
  const loaderTitleHash = framebufferHash(core.getFramebuffer());
  assert.equal(loaderTitleHash, "9bb3db5ea41d7e5891d8ef78d57f4ad4bd80284a11f4067fa303a15f64d78382",
    `unexpected Chess Champ loader title ${loaderTitleHash}`);

  runToFrame(300, 120);
  assert.equal(framebufferHash(core.getFramebuffer()), loaderTitleHash,
    "Chess Champ loader title must remain stable during its timed presentation");

  runToFrame(700, 300);
  assert.deepEqual([...core.getVdpRegisters()], [0x02, 0xE0, 0x06, 0x7F, 0x07, 0x00, 0x00, 0x0E]);
  const gameHash = framebufferHash(core.getFramebuffer());
  assert.equal(gameHash, "b66f4b9237c96a1087b9bbc826066b6ff101f6ecb9e0bf22e20d35fb55687eee",
    `unexpected Chess Champ game framebuffer ${gameHash}`);
  console.log(`Chess Champ ADAM compatibility: PASS (loader=${loaderTitleHash} game=${gameHash})`);
} finally {
  core.destroy();
}

function runToFrame(target, current = 0) {
  for (let frame = current; frame < target; frame += 1) core.runFrame();
}

function framebufferHash(frame) {
  const bytes = Buffer.from(frame.pixels.buffer, frame.pixels.byteOffset, frame.pixels.byteLength);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
