import assert from "node:assert/strict";
import {
  createColecoSoundTerminal,
  decodeColecoSoundSegment,
  findColecoSoundSegment,
  insertColecoSoundEvents,
  moveColecoSoundEvent,
  replaceColecoSoundSegment,
  validateColecoSoundSequence
} from "../studio/core/colecoSoundSequence.js";

const source = [
  "SoundA:",
  "    db $40,$6B,$00,$02",
  "SharedTail:",
  "    db $40,$6D,$30,$02,$50",
  "SoundB:",
  "    db $80,$74,$30,$01,$90",
  "OtherWords:",
  "    dw $1234"
].join("\n");

const prefix = findColecoSoundSegment(source, "SoundA");
assert.deepEqual(prefix.bytes, [0x40, 0x6B, 0x00, 0x02]);
assert.equal(prefix.nextLabel, "SharedTail");

const tail = decodeColecoSoundSegment(source, "SharedTail");
assert.equal(tail.events.length, 2);
assert.equal(tail.events[1].type, "end");
assert.equal(tail.sharedTailLabel, null);

const sharedPrefix = decodeColecoSoundSegment(source, "SoundA");
assert.equal(sharedPrefix.terminated, false);
assert.equal(sharedPrefix.sharedTailLabel, "SharedTail");

const moved = moveColecoSoundEvent(tail.events, 0, 1);
assert.equal(moved[0].type, "end");
assert.throws(() => moveColecoSoundEvent(tail.events, -1, 0), /outside/);

assert.deepEqual(createColecoSoundTerminal("end", 2).bytes, [0x90]);
assert.deepEqual(createColecoSoundTerminal("repeat", 0).bytes, [0x18]);
assert.throws(() => createColecoSoundTerminal("tiny"), /end or repeat/);
assert.throws(() => validateColecoSoundSequence(tail.events.toReversed()), /must be the last/);
assert.throws(() => validateColecoSoundSequence([{ bytes: [0x60] }]), /must end/);
assert.doesNotThrow(() => validateColecoSoundSequence([{ bytes: [0x60] }], { allowSharedTail: true }));

const inserted = insertColecoSoundEvents(tail.events, [{ type: "note", length: 3, bytes: [0x40, 0x10, 0x00, 0x03] }], 0);
assert.equal(inserted.selected, 1);
assert.equal(inserted.events[1].type, "note");
assert.equal(inserted.events.at(-1).type, "end", "insertions stay before the terminal command");
const appendedBeforeEnd = insertColecoSoundEvents(tail.events, [inserted.events[1]], 99);
assert.equal(appendedBeforeEnd.events.at(-2).type, "note");
assert.notEqual(appendedBeforeEnd.events.at(-2).bytes, inserted.events[1].bytes, "inserted command bytes are copied");

const replacement = replaceColecoSoundSegment(source, "SoundA", [{ bytes: [0x60] }]);
assert.match(replacement.source, /SoundA:\n    db \$60\nSharedTail:/);
assert.match(replacement.source, /SharedTail:\n    db \$40,\$6D,\$30,\$02,\$50/);
assert.equal(replacement.sharedTailPreserved, true);
assert.equal(replacement.nextLabel, "SharedTail");
assert.equal(replacement.sharedTailLabel, "SharedTail");

const replacedTail = replaceColecoSoundSegment(source, "SharedTail", tail.events, { bytesPerLine: 4 });
assert.match(replacedTail.source, /SharedTail:\n    db \$40,\$6D,\$30,\$02\n    db \$50\nSoundB:/);
assert.equal(replacedTail.sharedTailPreserved, false);
assert.equal(replacedTail.sharedTailLabel, null);

assert.throws(() => findColecoSoundSegment(source, "Missing"), /not found/);
assert.throws(() => replaceColecoSoundSegment(source, "SoundA", []), /cannot be empty/);
assert.throws(() => replaceColecoSoundSegment(source, "SharedTail", moved), /must be the last/);

console.log("Coleco sound sequence tests passed.");
