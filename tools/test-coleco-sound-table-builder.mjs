import assert from "node:assert/strict";
import { addColecoSoundToTableSource, buildColecoSoundTableSource, colecoSoundAreaAddress, insertColecoSoundTableSource } from "../studio/core/colecoSoundTableBuilder.js";

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
const extended = addColecoSoundToTableSource(inserted, { tableName: "GameSoundTable", soundName: "DoorSound", role: "sfx", slot: 6 });
assert.match(extended, /dw DoorSound,\$705D ; sfx · slot 6\n\nDoorSound:\n    db \$50/);
assert.match(extended, /dw MusicA,\$702B/, "existing table data must remain intact");
assert.throws(() => addColecoSoundToTableSource(extended, { tableName: "GameSoundTable", soundName: "DoorSound", slot: 4 }), /already exists/);
assert.throws(() => buildColecoSoundTableSource({ tableName: "Bad name", areaCount: 4, sounds: [{ name: "A", slot: 1 }] }), /identifier/);
assert.throws(() => buildColecoSoundTableSource({ tableName: "T", areaCount: 2, sounds: [{ name: "A", slot: 3 }] }), /slot from 1 to 2/);

console.log("Coleco sound table builder tests passed.");
