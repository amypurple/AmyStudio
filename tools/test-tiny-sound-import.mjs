// Unit tests for the Tiny Sound import feature's core functions (studio/core/colecoTinySound.js's
// scanTinySoundStreams, studio/core/colecoSoundTableBuilder.js's prepareTinySoundImport /
// insertTinySoundSongPlayback). Compiles the resulting fixture through the real Amy compiler
// and verifies the decoded sound table + playback references, per
// docs/handoff-claude-amy-tiny-sound-project-import-2026-09-06.md's acceptance criteria.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodeTinySoundSource, scanTinySoundStreams } from "../studio/core/colecoTinySound.js";
import { insertTinySoundSongPlayback, prepareTinySoundImport, renameLabelDeclaration } from "../studio/core/colecoSoundTableBuilder.js";
import { inspectSoundTableSource } from "../studio/core/soundTableInspector.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// A pasted/uploaded candidate fragment, matching the real Tiny Sound convention (db
// $44/$84, dw sndtiny_1/2, tempo, commands) - labels are deliberately unrelated to the
// song name used below, matching real usage (an imported file's own naming, e.g.
// "music_ch1_A", is whatever it already is).
const candidate = [
  "music_ch1_A:",
  "  db $44",
  "  dw sndtiny_1",
  "  db 8",
  "  db $02,$60,$19,$22",
  "  db $28,$00,$01,$FF",
  "",
  "music_ch2_A:",
  "  db $84",
  "  dw sndtiny_2",
  "  db 8",
  "  db $02,$50,$13,$33",
  "  db $23,$00,$01,$FF",
  ""
].join("\n");

// scanTinySoundStreams finds every valid stream label without needing to know its name up
// front, by trying the same readTinySoundLabel() the rest of Tiny Sound already trusts.
const found = scanTinySoundStreams(candidate);
assert.deepEqual(found, [{ label: "music_ch1_A", channel: 1 }, { label: "music_ch2_A", channel: 2 }]);

// Text with no Tiny Sound streams at all must scan clean (not throw, not find phantoms).
assert.deepEqual(scanTinySoundStreams("NotTiny:\n  db $50\n"), []);

// renameLabelDeclaration only touches the one declaration line.
const renamed = renameLabelDeclaration(candidate, "music_ch1_A", "Song_ch1");
assert.match(renamed, /^Song_ch1:$/m);
assert.doesNotMatch(renamed, /^music_ch1_A:$/m);
const referenced = renameLabelDeclaration(`${candidate}\nPointer:\n  dw music_ch1_A ; keep music_ch1_A documented\n`, "music_ch1_A", "Song_ch1");
assert.match(referenced, /dw Song_ch1 ; keep music_ch1_A documented/, "code references change while comments remain intact");
assert.throws(() => renameLabelDeclaration(candidate, "NoSuchLabel", "X"), /was not found/);

const ch1 = decodeTinySoundSource(candidate, "music_ch1_A", { region: "NTSC" });
const ch2 = decodeTinySoundSource(candidate, "music_ch2_A", { region: "NTSC" });
const durationFrames = Math.max(ch1.totalFrames, ch2.totalFrames);

const { fileText: preparedFileText, built } = prepareTinySoundImport({
  fileText: candidate,
  name: "MyTune",
  channels: [{ number: 1, label: "music_ch1_A" }, { number: 2, label: "music_ch2_A" }],
  durationFrames
});
assert.match(preparedFileText, /^MyTune_ch1:$/m, "channel 1 must be renamed so the existing sequencer's pairing regex can find it");
assert.match(preparedFileText, /^MyTune_ch2:$/m);
assert.match(preparedFileText, /dw MyTune_ch1,\$7049 ; music - channel 1/);
assert.match(preparedFileText, /dw MyTune_ch2,\$703F ; music - channel 2/);
assert.equal(built.setup, "set sound table MyTune_table areas 4");
assert.equal(built.play, "play song MyTune_song");

// Trigger byte layout, transcribed from src/alexis_lib/coleco_music.asm's
// AMY_TRIGGER_SOUNDS: bits 7-6 = (triggerCount-1), bits 5-0 = the 1-based sound-table
// index. Two channels at table position 1: (2-1)<<6 | 1 = 0x41, then index 2 = 0x02.
assert.match(preparedFileText, /db \$41,\$02/);
// The loop/chain word must have bit 15 set (a real label address always does) so the
// runtime treats it as "jump back to this song" rather than a duration.
assert.match(preparedFileText, /dw MyTune_song ; loop forever/);

// Single-channel import must also work (channel 2 omitted).
const soloResult = prepareTinySoundImport({
  fileText: candidate,
  name: "SoloTune",
  channels: [{ number: 1, label: "music_ch1_A" }],
  durationFrames: ch1.totalFrames
});
assert.match(soloResult.fileText, /dw SoloTune_ch1,\$7049/);
assert.doesNotMatch(soloResult.fileText, /SoloTune_ch2/);
assert.match(soloResult.fileText, /db \$01/, "single-channel trigger byte: (1-1)<<6 | firstIndex(1) = 0x01");

// Rejections: bad name, duplicate channel, out-of-range duration.
assert.throws(() => prepareTinySoundImport({ fileText: candidate, name: "bad name", channels: [{ number: 1, label: "music_ch1_A" }], durationFrames: 1 }), /Amy identifier/);
assert.throws(() => prepareTinySoundImport({ fileText: candidate, name: "X", channels: [{ number: 1, label: "music_ch1_A" }, { number: 1, label: "music_ch2_A" }], durationFrames: 1 }), /picked twice/);
assert.throws(() => prepareTinySoundImport({ fileText: candidate, name: "X", channels: [{ number: 1, label: "music_ch2_A" }], durationFrames: 1 }), /encoded for channel 2/);
assert.throws(() => prepareTinySoundImport({ fileText: candidate, name: "X", channels: [{ number: 1, label: "music_ch1_A" }], durationFrames: 0x8000 }), /1\.\.32767/);

// insertTinySoundSongPlayback: installTable:true inserts both lines right after "sub
// start:"; installTable:false must leave the source completely untouched (never silently
// starts a second table/song).
let amySource = [
  'project "Tiny Import Test"',
  'memory "colecovision_legacy_sdcc"',
  "sub start:",
  "  text screen",
  "  screen on",
  "MainLoop:",
  "  wait 1 frames",
  "  goto MainLoop",
  "end sub",
  "",
  'include "@project/mytune-tiny-music.asm"'
].join("\n");
const untouched = insertTinySoundSongPlayback(amySource, built, { installTable: false });
assert.equal(untouched, amySource, "installTable:false must not modify the source (an existing table must never be silently replaced)");
amySource = insertTinySoundSongPlayback(amySource, built, { installTable: true });
assert.match(amySource, /sub start:\n\s*set sound table MyTune_table areas 4\n\s*play song MyTune_song/);

async function assertRomProducesAudio(romBytes, profile) {
  const core = await GearcolecoTestCore.create({ seed: 0x54494E59 });
  try {
    core.loadBios(fs.readFileSync(path.join(root, "studio/bios/colecovision.rom")));
    core.loadRom(romBytes, { region: GEARCOLECO_TEST_REGION.NTSC });
    let nonZeroSamples = 0;
    for (let frame = 0; frame < 120; frame += 1) {
      core.runFrame();
      for (const sample of core.getAudioFrame().samples) {
        if (sample !== 0) nonZeroSamples += 1;
      }
    }
    assert.ok(nonZeroSamples > 0, `${profile}: imported Tiny Sound song must produce PCM`);
  } finally {
    core.destroy();
  }
}

// Compile exactly what the importer generated, through every optimization profile, then
// boot each ROM and require real PCM output. The attached file remains a genuine separate
// include, matching the project workflow in Amy Studio.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-tiny-import-test-"));
try {
  const sourcePath = path.join(temp, "s.alexis");
  fs.writeFileSync(path.join(temp, "mytune-tiny-music.asm"), preparedFileText);
  fs.writeFileSync(sourcePath, amySource);
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const romPath = path.join(temp, `r-${profile}.rom`);
    execFileSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--rom", romPath, "--opt", profile, "--project-dir", temp], { cwd: root, stdio: "pipe" });
    assert.ok(fs.existsSync(romPath), `${profile}: ROM must be produced`);
    await assertRomProducesAudio(fs.readFileSync(romPath), profile);
  }

  // Verify the sound-table inspector (the same one the Sound Library uses) finds the new
  // table and both entries when it inspects the attached file's own text, and that they
  // decode as genuine Tiny Sound streams (not a BIOS-format fallback).
  const analysis = inspectSoundTableSource(preparedFileText);
  assert.equal(analysis.tables.length, 1, "exactly one sound table must be found");
  const table = analysis.tables[0];
  assert.equal(table.name, "MyTune_table");
  assert.equal(table.entries.length, 2);
  assert.equal(table.entries[0].label, "MyTune_ch1");
  assert.equal(table.entries[1].label, "MyTune_ch2");
  assert.equal(table.entries[0].stream?.format, "tiny");
  assert.equal(table.entries[1].stream?.format, "tiny");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("Tiny Sound import tests passed.");
