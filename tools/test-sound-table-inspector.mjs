import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inspectProjectSoundFile, inspectSoundTableSource } from "../studio/core/soundTableInspector.js";

const source = `; Shared-tail sound fixture\r\nFixtureTable:\r\n    dw KeyTail,$702B\r\n    dw TeleportTail,$7035\r\n    dw Death,$703F\r\n\r\nDeath:\r\n    db $40,$A6,$20,$01\r\nTeleportTail:\r\n    db $40,$ED,$10,$01\r\nKeyTail:\r\n    db $40,$88,$10,$01,$50\r\n`;
const result = inspectSoundTableSource(source);

assert.equal(result.tables.length, 1);
assert.equal(result.tables[0].name, "FixtureTable");
assert.deepEqual(result.tables[0].entries.map((entry) => entry.area), [1, 2, 3]);
assert.deepEqual(result.tables[0].entries.map((entry) => entry.priority), [1, 2, 3]);
assert.deepEqual(result.tables[0].entries.map((entry) => entry.stream.status), ["valid", "valid", "valid"]);
assert.deepEqual(result.tables[0].entries.map((entry) => entry.stream.byteCount), [5, 9, 13]);
assert.deepEqual(result.tables[0].entries.map((entry) => entry.stream.eventCount), [2, 3, 4]);
assert.deepEqual(result.diagnostics, []);
assert.equal(result.serialize(), source, "inspection must preserve expert ASM byte-for-byte");

const invalid = inspectSoundTableSource(`BadTable:\n  dw Missing,$7035\n`);
assert.match(invalid.diagnostics.join("\n"), /entry 1 should target \$702B/);
assert.match(invalid.diagnostics.join("\n"), /missing sound label Missing/);
assert.equal(inspectProjectSoundFile({ path: "ordinary.asm" }, new TextEncoder().encode("Value: db 1")), null);
assert.equal(inspectProjectSoundFile({ path: "sounds.bin" }, new TextEncoder().encode(source)), null);
assert.equal(inspectProjectSoundFile({ path: "sounds.inc" }, new TextEncoder().encode(source))?.tables.length, 1);

const sharedPriority = inspectSoundTableSource(`SharedPriorityTable:\n  dw Key,$702B\n  dw Teleport,$703F\n  dw Lock,$703F\nKey:\n  db $50\nTeleport:\n  db $50\nLock:\n  db $50\n`);
assert.deepEqual(sharedPriority.tables[0].entries.map((entry) => entry.priority), [1, 3, 3]);

const arithmeticAreas = inspectSoundTableSource(`ArithmeticTable:\n  dw First,0x702B\n  dw Second,0x702B+10\n  dw Third,$703F-10\nFirst:\n  db $50\nSecond:\n  db $50\nThird:\n  db $50\n`);
assert.deepEqual(arithmeticAreas.tables[0].entries.map((entry) => entry.area), [1, 2, 2]);

const publishedSource = await readFile(new URL("../studio/examples-src/space-trainer.alexis", import.meta.url), "utf8");
const published = inspectSoundTableSource(publishedSource);
assert.deepEqual(published.tables.map((table) => table.name), ["SpaceTrainerSoundTable"]);
assert.deepEqual(published.tables.map((table) => table.entries.length), [3]);
assert.deepEqual(published.diagnostics, []);

console.log("Sound-table inspector tests passed.");
