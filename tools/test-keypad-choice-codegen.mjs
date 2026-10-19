#!/usr/bin/env node
import assert from "node:assert/strict";
import { handleVramPixelInputStatement } from "../studio/core/compiler/vramPixelInputStatementHelpers.js";

function compile(line, { nmiKnownOff = false, dataLengths = {} } = {}) {
  const body = [];
  const result = handleVramPixelInputStatement({
    line,
    rawLine: line,
    body,
    emitLoadVramAddressIntoHL: () => null,
    emitLoadInt8ValueInto: (register, token) => ["    ld " + register + "," + token],
    emitLoadInt16IntoHL: () => null,
    emitStoreInt8FromA: (name) => ["    ld (" + name + "),a"],
    resolveValueType: (name) => name === "Choice" ? "int8" : null,
    emitLoadInt8ValueIntoPreserving: (register, token) => ["    ld " + register + "," + token],
    getRuntimeInfo: (name) => name === "Choice" ? { type: "int8" } : null,
    emitStoreInt16FromHL: () => null,
    makeGeneratedLabel: () => "unused",
    currentGraphicsMode: null,
    tryEvaluateConstantExpression: (token) => /^\d+$/.test(token) ? Number.parseInt(token, 10) : null,
    resolveAddressSymbol: (name) => `AMY_DATA_${name}`,
    getDataByteLength: (name) => dataLengths[name] ?? null,
    nmiKnownOff
  });
  return { ...result, body };
}

assert.deepEqual(compile(
  "choose keypad KeyReplay to KeyMenu into Choice on keypad 2 sleep after 5 seconds"
), {
  handled: true,
  ok: true,
  body: [
    "    ld b,KeyReplay",
    "    ld c,KeyMenu",
    "    ld hl,300",
    "    ld de,250",
    "    ld a,2",
    "    call AMY_CHOICE_KEYPAD_RANGE_BLANK",
    "    ld (Choice),a"
  ]
});

assert.deepEqual(compile("choose keypad 10 to 11 into Choice sleep after 3 seconds").body, [
  "    ld b,10",
  "    ld c,11",
  "    ld hl,180",
  "    ld de,150",
  "    ld a,0",
  "    call AMY_CHOICE_KEYPAD_RANGE_BLANK",
  "    ld (Choice),a"
]);

assert.match(
  compile("choose keypad 10 to 11 into Choice sleep after 5 seconds", { nmiKnownOff: true }).log,
  /requires NMI enabled/
);
assert.match(
  compile("choose keypad 10 to 11 into Choice sleep after 0 seconds").log,
  /1 to 1092 seconds/
);
assert.deepEqual(compile("choose keypad 1 to 3 into Choice").body, [
  "    ld b,1",
  "    ld c,3",
  "    call AMY_CHOICE_KEYPAD_RANGE",
  "    ld (Choice),a"
]);

const menuChoice = compile("choose menu 1 to 4 into Choice cursor $3E at 6,9 step 2 sleep after 10 seconds");
assert.equal(menuChoice.ok, true);
assert.match(menuChoice.body.join("\n"), /call AMY_PUT_CHAR_AT/);
assert.match(menuChoice.body.join("\n"), /call AMY_SLEEP_SERVICE/);
assert.match(menuChoice.body.join("\n"), /ld a,\(KEYPAD_1\)/);
assert.match(menuChoice.body.join("\n"), /ld a,\(JOYPAD_1\)/);
assert.match(menuChoice.body.join("\n"), /and \$C0/);
const gappedMenuChoice = compile("choose menu 1 to 8 into Choice cursor $3E at 3,6 step 2 gap 1 after 4");
assert.equal(gappedMenuChoice.ok, true);
assert.match(gappedMenuChoice.body.join("\n"), /cp 5/);
assert.match(gappedMenuChoice.body.join("\n"), /add a,1/);
const listedMenuChoice = compile(
  "choose menu 1 to 3 into Choice cursor $3E at list MenuSpots sleep after 10 seconds",
  { dataLengths: { MenuSpots: 6 } }
);
assert.equal(listedMenuChoice.ok, true);
assert.match(listedMenuChoice.body.join("\n"), /ld hl,AMY_DATA_MenuSpots/);
assert.match(listedMenuChoice.body.join("\n"), /add hl,de/);
assert.match(listedMenuChoice.body.join("\n"), /bit 1,a/);
assert.match(listedMenuChoice.body.join("\n"), /bit 3,a/);
assert.match(listedMenuChoice.body.join("\n"), /call AMY_SLEEP_SERVICE/);
assert.match(
  compile("choose menu 1 to 3 into Choice cursor $3E at list MenuSpots", { dataLengths: { MenuSpots: 4 } }).log,
  /requires 6 X,Y bytes/
);
assert.match(
  compile("choose menu 1 to 3 into Choice cursor $3E at list MissingSpots").log,
  /requires a byte data table named 'MissingSpots'/
);
assert.match(
  compile("choose menu 1 to 4 into Choice cursor $3E at 6,9 step 2 sleep after 10 seconds", { nmiKnownOff: true }).log,
  /requires NMI enabled/
);

const spriteMenuChoice = compile("choose menu 1 to 4 into Choice cursor sprite 2 at 48,71 step 16 sleep after 10 seconds");
assert.equal(spriteMenuChoice.ok, true);
assert.match(spriteMenuChoice.body.join("\n"), /ld \(AMY_SPRITE_TABLE\+9\),a/);
assert.match(spriteMenuChoice.body.join("\n"), /ld \(AMY_SPRITE_TABLE\+8\),a/);
assert.match(spriteMenuChoice.body.join("\n"), /call AMY_UPDATE_SPRITES/);
assert.doesNotMatch(spriteMenuChoice.body.join("\n"), /call AMY_PUT_CHAR_AT/);
const listedSpriteMenuChoice = compile(
  "choose menu 1 to 3 into Choice cursor sprite 2 at list MenuSpotsPx",
  { dataLengths: { MenuSpotsPx: 6 } }
);
assert.equal(listedSpriteMenuChoice.ok, true);
assert.match(listedSpriteMenuChoice.body.join("\n"), /ld hl,AMY_DATA_MenuSpotsPx/);
assert.match(listedSpriteMenuChoice.body.join("\n"), /ld \(AMY_SPRITE_TABLE\+9\),a/);
const gappedSpriteMenuChoice = compile("choose menu 1 to 8 into Choice cursor sprite 2 at 16,48 step 16 gap 8 after 4");
assert.equal(gappedSpriteMenuChoice.ok, true);
assert.match(gappedSpriteMenuChoice.body.join("\n"), /cp 5/);
assert.match(gappedSpriteMenuChoice.body.join("\n"), /add a,8/);
assert.match(
  compile("choose menu 1 to 4 into Choice cursor sprite CursorIndex at 48,71 step 16").log,
  /constant sprite index from 0 to 31/
);

console.log("CRT-safe keypad and cursor menu choice codegen PASS");
