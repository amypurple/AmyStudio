import assert from "node:assert/strict";
import { addColecoSoundToTableSource, buildColecoSoundTableSource, colecoSoundAreaAddress, insertColecoSoundPlayback, insertColecoSoundTableSource } from "../studio/core/colecoSoundTableBuilder.js";

assert.equal(colecoSoundAreaAddress(1), 0x702b);
assert.equal(colecoSoundAreaAddress(8), 0x7071);
const built = buildColecoSoundTableSource({
  tableName: "GameSoundTable",
  areaCount: 6,
  sounds: [
    { name: "MusicA", role: "music", slot: 1 },
    { name: "MusicB", role: "music", slot: 2 },
    { name: "JumpSound", role: "sfx", slot: 5 },
    { name: "HitSound", role: "sfx", slot: 5 }
  ]
});
assert.equal(built.setup, "set sound table GameSoundTable areas 6");
assert.match(built.asm, /dw MusicA,\$702B ; music · slot 1/);
assert.match(built.asm, /dw HitSound,\$7053 ; sfx · slot 5/);
assert.deepEqual(built.sharedSlots, [{ slot: 5, names: ["JumpSound", "HitSound"] }]);
const inserted = insertColecoSoundTableSource("project \"SOUND TEST\"\n\nsub start:\n  text screen\n", built);
assert.match(inserted, /sub start:\n  set sound table GameSoundTable areas 6\n  text screen/);
assert.match(inserted, /GameSoundTable:\n    dw MusicA/);
const repaired = insertColecoSoundTableSource("sub start:\n  set sound table GameSoundTable areas 6\n  text screen\n", built);
assert.equal((repaired.match(/set sound table GameSoundTable areas 6/g) || []).length, 1, "repair must not duplicate setup");
assert.match(repaired, /GameSoundTable:\n    dw MusicA/, "missing table data is repaired");
assert.throws(() => insertColecoSoundTableSource(inserted, built), /already installed.*Open SOUND/i);
const extended = addColecoSoundToTableSource(inserted, { tableName: "GameSoundTable", soundName: "DoorSound", role: "sfx", slot: 6 });
assert.match(extended, /dw DoorSound,\$705D ; sfx · slot 6\n\nDoorSound:\n    db \$50/);
assert.match(extended, /dw MusicA,\$702B/, "existing table data must remain intact");
assert.throws(() => addColecoSoundToTableSource(extended, { tableName: "GameSoundTable", soundName: "DoorSound", slot: 4 }), /already exists/);
assert.throws(() => buildColecoSoundTableSource({ tableName: "Bad name", areaCount: 4, sounds: [{ name: "A", slot: 1 }] }), /identifier/);
assert.throws(() => buildColecoSoundTableSource({ tableName: "T", areaCount: 2, sounds: [{ name: "A", slot: 3 }] }), /slot from 1 to 2/);
assert.throws(() => buildColecoSoundTableSource({ tableName: "T", areaCount: 6, sounds: [{ name: "OnlyEffect", slot: 6 }] }), /first sound-table entry must use BIOS slot 1/i);

const explicitStart = "sub start:\n  set sound table GameSoundTable areas 6\n  text screen\nend sub\n\nasm {\nSounds:\n  db $50\n}\n";
const safePlay = insertColecoSoundPlayback(explicitStart, {
  tableName: "GameSoundTable", areaCount: 6, play: "play sound 3",
  selectionStart: explicitStart.length, selectionEnd: explicitStart.length
});
assert.match(safePlay, /text screen\n  play sound 3\nend sub/, "cursor outside explicit Start inserts before end sub");
assert.equal((safePlay.match(/set sound table GameSoundTable areas 6/g) || []).length, 1, "same active table is not repeated");

const implicitStart = "text screen\ninclude \"@project/sounds.asm\"\nscreen on\n";
const safeImplicitPlay = insertColecoSoundPlayback(implicitStart, {
  tableName: "GameSoundTable", areaCount: 6, play: "play sound 1",
  selectionStart: implicitStart.length, selectionEnd: implicitStart.length
});
assert.match(safeImplicitPlay, /screen on\nset sound table GameSoundTable areas 6\nplay sound 1/, "implicit Start remains one contiguous top-level program");

console.log("Coleco sound table builder tests passed.");
