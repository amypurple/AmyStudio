#!/usr/bin/env node
import assert from "node:assert/strict";

import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";

function compile(source) {
  const result = transpileAmyForTest(source);
  assert.equal(result.ok, true, result.log);
  return result.asmBody;
}

const managed = compile(`
memory "colecovision_legacy_sdcc"
data Tiles bytes 1,2,3,4,5,6,7,8
tile screen
copy Tiles count 8 to vram.pattern + 1024
screen on
`);
assert.match(managed, /call AMY_VRAM_BEGIN[\s\S]*call WRITE_VRAM[\s\S]*call AMY_VRAM_END/i);

const explicit = compile(`
memory "colecovision_legacy_sdcc"
data Tiles bytes 1,2,3,4,5,6,7,8
tile screen
nmi off
copy Tiles count 8 to vram.pattern + 1024
nmi on
screen on
`);
assert.doesNotMatch(explicit, /call AMY_VRAM_BEGIN/i);
assert.doesNotMatch(explicit, /call AMY_VRAM_END/i);
assert.match(explicit, /call WRITE_VRAM/i);

const restored = compile(`
memory "colecovision_legacy_sdcc"
data Tiles bytes 1,2,3,4,5,6,7,8
tile screen
nmi off
copy Tiles count 8 to vram.pattern + 1024
nmi on
copy Tiles count 8 to vram.pattern + 2048
screen on
`);
assert.match(restored, /call AMY_ENABLE_NMI[\s\S]*call AMY_VRAM_BEGIN[\s\S]*call WRITE_VRAM[\s\S]*call AMY_VRAM_END/i);

const screenRestored = compile(`
memory "colecovision_legacy_sdcc"
data Tiles bytes 1,2,3,4,5,6,7,8
tile screen
nmi off
copy Tiles count 8 to vram.pattern + 1024
screen on
copy Tiles count 8 to vram.pattern + 2048
`);
assert.match(screenRestored, /call AMY_SCREEN_ON[\s\S]*call AMY_VRAM_BEGIN[\s\S]*call WRITE_VRAM[\s\S]*call AMY_VRAM_END/i);

console.log("explicit NMI VRAM batch tests passed");
