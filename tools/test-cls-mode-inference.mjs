#!/usr/bin/env node
import assert from "node:assert/strict";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";

function compile(source) {
  const result = transpileAmyForTest(source);
  assert.equal(result.ok, true, result.log);
  return result.asmBody;
}

const directTile = compile(`
sub ClearScene:
  cls
end sub

tile screen
ClearScene()
`);
assert.match(directTile, /xor a[\s\S]*call FILL_VRAM/i);

const directText = compile(`
sub ClearScene:
  cls
end sub

text screen
ClearScene()
`);
assert.match(directText, /ld a,\$20[\s\S]*call FILL_VRAM/i);

const transitiveTile = compile(`
sub ClearLeaf:
  cls
end sub

sub ClearScene:
  ClearLeaf()
end sub

tile screen
ClearScene()
`);
assert.match(transitiveTile, /xor a[\s\S]*call FILL_VRAM/i);

const sameModeCallers = compile(`
sub ClearScene:
  cls
end sub

tile screen
ClearScene()
tile screen
ClearScene()
`);
assert.match(sameModeCallers, /xor a[\s\S]*call FILL_VRAM/i);

const conflicting = transpileAmyForTest(`
sub ClearScene:
  cls
end sub

text screen
ClearScene()
tile screen
ClearScene()
`);
assert.equal(conflicting.ok, false);
assert.match(conflicting.log, /incompatible or unproven screen modes/i);

const explicitConflict = compile(`
sub ClearScene:
  cls with $07
end sub

text screen
ClearScene()
tile screen
ClearScene()
`);
assert.match(explicitConflict, /ld a,\$07[\s\S]*call FILL_VRAM/i);

const branchIsConservative = compile(`
u8 UseTiles = 1
sub ClearScene:
  cls
end sub

text screen
if UseTiles = 1 then goto Tiles
ClearScene()
Tiles:
tile screen
ClearScene()
`);
assert.match(branchIsConservative, /ld a,\$20[\s\S]*call FILL_VRAM/i);

console.log("CLS interprocedural mode inference PASS");
