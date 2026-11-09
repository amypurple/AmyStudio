import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assembleAmysCVAssembly } from "../../studio/vendor/amyscvassembly/compilerCore.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../../studio/core/gearcolecoTestCore.js";
import { buildGearcolecoAuditionAsm, createSong } from "./core.js";

const song = createSong(8);
song.tempo = 6;
song.channels[0][0] = { code: 0x28, instrument: "bass" };
song.channels[1][0] = { code: 0x2d, instrument: "piano" };
let source = buildGearcolecoAuditionAsm(song);
source = source.replace(
  '    include "src/alexis_lib/coleco_tiny_sound.asm"',
  await readFile(new URL("../../src/alexis_lib/coleco_tiny_sound.asm", import.meta.url), "utf8")
);
const assembled = await assembleAmysCVAssembly(
  { "audition.asm": new TextEncoder().encode(source) },
  "audition.asm",
  { outputFilename: "audition.rom", outputMode: "binary", targetPlatform: "raw", optimizerEnabled: false }
);
assert.equal(assembled.ok, true, assembled.log);
assert.ok(assembled.binary.length > 0 && assembled.binary.length <= 0x8000);

const core = await GearcolecoTestCore.create();
try {
  core.loadBios(await readFile(new URL("../../studio/bios/colecovision.rom", import.meta.url)));
  core.loadRom(assembled.binary, { region: GEARCOLECO_TEST_REGION.NTSC });
  core.reset();
  let peak = 0;
  for (let frame = 0; frame < 24; frame += 1) {
    core.runFrame();
    for (const sample of core.getAudioFrame().samples) peak = Math.max(peak, Math.abs(sample));
  }
  assert.ok(peak > 0, "GearColeco audition ROM must produce non-silent PCM");
} finally {
  core.destroy();
}

console.log("Tiny Sound GearColeco audition test passed.");
