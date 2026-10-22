#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadCodec } from "../studio/vendor/retrocompress-lite/js/codecConfig.js";

const dir = resolve("examples/ports/books/caverns");
const source = readFileSync(resolve(dir, "caverns.alexis"), "utf8");

assert.match(source, /^project "In the Caverns of Carnage"/m);
assert.doesNotMatch(source, /^cartridge\s+/m, "the BIOS cartridge title must be bypassed");
assert.doesNotMatch(source, /\n  EditorialPage\n/, "the editorial page must not delay startup");
assert.match(source, /sub TitlePage:[\s\S]*?show picture CavernsTitle[\s\S]*?pause until press/,
  "the title must use the compressed Graphics II picture");
assert.match(source, /sub StartCave:[\s\S]*?tile screen\s+ClearBoth/,
  "gameplay must restore its charset after the bitmap title");
assert.match(source, /sub StartCave:[\s\S]*?RebuildBoth\s+StatusBoth\s+screen on\s+return/,
  "gameplay must enable display only after both scrolling pages are rebuilt");
assert.match(source, /print at 2,0, "SC"[\s\S]*?print at 5,0, digits\$\(NumU, 5\)[\s\S]*?print at 11,0, "LV"[\s\S]*?print at 17,0, "HI"[\s\S]*?put char HighName\[2\] at 22,0[\s\S]*?print at 24,0, digits\$\(NumU, 5\)/,
  "the HUD must retain score, lives, initials and high score inside columns 2-28");
assert.doesNotMatch(source, /(?:print|put char).* at (?:0|1|31),0/,
  "the HUD must avoid CRT-unsafe edge columns");
assert.match(source, /u8 Lives = 5[\s\S]*?Lives = 5\s+StartCave/,
  "a new game must provide five lives");
assert.match(source, /const FirstCaveRow = 3[\s\S]*?ZRow = FirstCaveRow/,
  "the scrolling renderer must leave two extra rows free above the cave");
assert.match(source, /if joypad\(1\)\.down then Down = 1[\s\S]*?if CY > CoupleYMin then[\s\S]*?if CY < CoupleYMax then/,
  "the couple must have bounded vertical movement");
assert.match(source, /N = CY - 2\s+if R = 1 then N = CY \+ 4/,
  "wall collision must follow the couple vertically");
assert.match(source, /P = CY \+ 1[\s\S]*?K = CY \+ 13/,
  "creature collision must follow the couple vertically");
assert.match(source, /PA\[K\] = 2\s+PB\[K\] = 29/,
  "the final opening must stay inside the CRT-safe playfield");
assert.match(source, /R = 28 - CaveW[\s\S]*?PB\[K\] = R \+ 3\s+if PB\[K\] > 29 then PB\[K\] = 29/,
  "the cave and right side passages must stop at column 29");
assert.match(source, /Gap = 0\s+' Keep the cavern busy[\s\S]*?P = random\(0, 5\)\s+if P = 0 then return\s+for I = 0 to 9/,
  "creature generation must omit only one prospective spawn in six");
assert.match(source, /final_score:\s+HideSprites\s+ClearBoth[\s\S]*?ClearBoth\s+print at 4,3, "IN THE CAVERNS"[\s\S]*?choose menu 1 to 2 into Choice cursor \$3E at 6,17 step 2/,
  "the final choice must use a clean, stable results screen instead of the cave playfield");

const zx0 = await loadCodec("zx0");
for (const table of ["pattern", "color"]) {
  const packed = readFileSync(resolve(dir, `caverns-title.${table}.zx0`));
  const raw = readFileSync(resolve(dir, `caverns-title.${table}.raw`));
  assert.deepEqual(Buffer.from(await zx0.decompress(packed)), raw, `${table} ZX0 round-trip`);
  assert.equal(raw.length, 6144);
}

console.log("Caverns port tests passed.");
