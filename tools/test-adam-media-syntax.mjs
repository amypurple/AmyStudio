#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleAdamStatement } from "../studio/core/compiler/adamStatementHelpers.js";

let label = 0;
const nativeContext = Object.freeze({
  platform: "adam-native-program",
  medium: "dsk",
  capabilities: ["adam", "eos", "file-io"]
});
const compile = (line, buildContext = nativeContext) => handleAdamStatement({
  line,
  rawLine: line,
  buildContext,
  emitLoadInt16IntoHL: () => ["    ld hl,1"],
  emitLoadInt8TermIntoA: () => ["    ld a,1"],
  emitLoadSourceAddressIntoHL: () => ["    ld hl,Buffer"],
  emitStoreInt8FromA: (target) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(target) ? [`    ld (${target}),a`] : null,
  resolveValueType: (target) => ["Size", "RecordSize"].includes(target.trim()) ? "u32" : "u8",
  getRuntimeInfo: (target) => target.trim() === "Buffer"
    ? { kind: "record", recordSize: 1024 }
    : target.trim() === "FileInfo"
      ? { kind: "record", recordTypeName: "EosFile", recordSize: 23 }
      : null,
  makeGeneratedLabel: (prefix) => `${prefix}_${label++}`
});

for (const [source, vector] of [
  ['Buffer = read "DATA" count 16 status Status', "$FCD2"],
  ['Buffer = read "DATA" count 16', "$FCD2"],
  ['write "SAVE" from Buffer count 16 status Status', "$FCD5"],
  ['write "SAVE" from Buffer count 16', "$FCD5"],
  ['create "SAVE" 1024 status Status', "$FCC9"],
  ['create "SAVE" Size status Status', "$FCC9"],
  ['create "SAVE" 1024', "$FCC9"],
  ['Exists = exists "SAVE" status Status', "$FCCC"],
  ['Exists = exists "SAVE"', "$FCCC"],
  ['Size = size "SAVE" status Status', "$FCCC"],
  ['Size = size "SAVE"', "$FCCC"],
  ['Found = find "SAVE" as FileInfo status Status', "$FCCC"],
  ['Found = find "SAVE" as FileInfo', "$FCCC"],
  ['rename "SAVE" to "BACKUP" status Status', "$FCDE"],
  ['rename "SAVE" to "BACKUP"', "$FCDE"],
  ['delete "SAVE" status Status', "$FCE1"],
  ['delete "SAVE"', "$FCE1"],
  ["Buffer = read block 3 status Status", "$FCF3"],
  ["Buffer = read block 3", "$FCF3"],
  ["block write 3 from Buffer status Status", "$FCF6"],
  ["block write 3 from Buffer", "$FCF6"],
  ["Count = catalog Buffer status Status", "$FCF3"],
  ["Count = catalog Buffer", "$FCF3"]
]) {
  const result = compile(source);
  assert.equal(result.ok, true, source);
  assert.match(result.lines.join("\n"), new RegExp(`call \\${vector}`, "i"), source);
}

for (const removed of [
  'file read "DATA" into Buffer count 16 status Status',
  'Buffer = read file "DATA" count 16 status Status',
  'file write "SAVE" from Buffer count 16 status Status',
  'Exists = file exists "SAVE" status Status',
  'Size = file size "SAVE" status Status',
  "block read 3 into Buffer status Status",
  'adam read file "DATA" into Buffer count 16 status Status',
  'adam write file "SAVE" from Buffer count 16 status Status',
  'adam create file "SAVE" size 1024 status Status',
  'file create "SAVE" size 1024 status Status',
  'file rename "SAVE" to "BACKUP" status Status',
  'file delete "SAVE" status Status',
  'adam rename file "SAVE" to "BACKUP" status Status',
  'adam delete file "SAVE" status Status',
  "adam read block 3 into Buffer status Status",
  "adam write block 3 from Buffer status Status"
]) {
  assert.equal(compile(removed).handled, false, removed);
}

const rejected = compile('Buffer = read "DATA" count 16 status Status', {
  platform: "colecovision-cartridge",
  medium: null,
  capabilities: ["os7"]
});
assert.equal(rejected.ok, false);
assert.match(rejected.log, /EOS-capable ADAM target/i);

for (const [medium, device] of [["dsk", "$04"], ["ddp", "$08"]]) {
  const hybridContext = {
    platform: medium === "ddp" ? "adam-data-pack" : "adam-disk",
    medium,
    memoryProfile: "adam-os7-eos-drivers",
    capabilities: ["adam", "os7", "eos", "file-io"]
  };
  const hybridRead = compile("Buffer = read block 3 status Status", hybridContext);
  assert.equal(hybridRead.ok, true, `hybrid ${medium} block read`);
  assert.match(hybridRead.lines.join("\n"), new RegExp(`ld a,\\${device}`, "i"));
  assert.match(hybridRead.lines.join("\n"), /call \$FCF3/i);
}

const compatibilityRejected = compile('Buffer = read "DATA" count 16 status Status', {
  platform: "adam-disk",
  medium: "dsk",
  memoryProfile: "colecovision_legacy_sdcc",
  capabilities: ["adam", "os7"]
});
assert.equal(compatibilityRejected.ok, false);
assert.match(compatibilityRejected.log, /EOS-capable ADAM target/i);

const wrongSizeType = compile('ByteSize = size "SAVE" status Status');
assert.equal(wrongSizeType.ok, false);
assert.match(wrongSizeType.log, /u32/i);

const wideCreate = compile('create "SAVE" Size status Status');
assert.match(wideCreate.lines.join("\n"), /ld e,\(hl\)[\s\S]*ld b,\(hl\)/i);

const unsafeCatalog = compile('Count = catalog SmallBuffer status Status');
assert.equal(unsafeCatalog.ok, false);
assert.match(unsafeCatalog.log, /1024-byte directory record/i);

const unsafeFind = compile('Found = find "SAVE" as Buffer status Status');
assert.equal(unsafeFind.ok, false);
assert.match(unsafeFind.log, /EosFile record/i);

const recordSize = compile('RecordSize = size FileInfo');
assert.equal(recordSize.ok, true);
assert.doesNotMatch(recordSize.lines.join("\n"), /call \$FCCC/i);

console.log("ADAM media syntax: PASS (native/hybrid EOS, DSK/DDP devices, compatibility/OS7 rejection)");
