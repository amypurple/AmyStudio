#!/usr/bin/env node
import assert from "node:assert/strict";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";

function compile(name, source) {
  const result = transpileAmyForTest(source);
  assert.equal(result.ok, true, `${name}: ${result.log || "transpile failed"}`);
  assert.doesNotMatch(result.asmBody || "", /Unknown statement|Invalid runtime assignment/i, name);
  return result.asmBody || "";
}

for (const [name, statement, supported] of [
  ["put char", "put char 65 at 1,1", false],
  ["print", 'print at 2,2, "OK"', true],
  ["fill", "fill 32 count 2 at 3,3", false],
  ["set sprite", "set sprite 0 to 16,16,0,15", true],
  ["play sound", "play sound Tone in area $7035", false],
]) {
  const result = transpileAmyForTest(`
u8 Flag = 1
data Tone bytes = $50
sub start:
  if Flag then ${statement}
  loop forever
end sub
`);
  assert.equal(result.ok, supported, `inline ${name}: ${result.log || "unexpected compiler result"}`);
  if (!supported) assert.match(result.log || "", /Unsupported inline statement/i, `inline ${name}`);
}

const widening = compile("u8 RAM element widening", `
u8 Index = 0
u8 Values[2]
u16 Wide = 0
sub start:
  Wide = Values[Index]
  loop forever
end sub
`);
assert.match(widening, /AMY_UVAR_WIDE/i);

const romWidening = transpileAmyForTest(`
u8 Index = 0
u16 Wide = 0
data RomValues bytes = 3,4
sub start:
  Wide = RomValues[Index]
  loop forever
end sub
`);
assert.equal(romWidening.ok, false, "u8 ROM-table widening unexpectedly compiled; update the guide");
assert.match(romWidening.log || "", /Invalid runtime assignment/i);

const offsetCopy = transpileAmyForTest(`
u8 Source[8]
u8 Target[16]
u8 Offset = 3
sub start:
  copy Source count 8 to Target + Offset
  loop forever
end sub
`);
assert.equal(offsetCopy.ok, false, "RAM copy with offset destination unexpectedly compiled; update the guide");
assert.match(offsetCopy.log || "", /unknown statement/i);

const boundedRandom = compile("variable random bounds", `
u8 Minimum = 2
u8 Maximum = 7
u8 Result = 0
sub start:
  Result = random(Minimum, Maximum)
  loop forever
end sub
`);
assert.match(boundedRandom, /AMY_RANDOM_U8/);

const mixedCompare = compile("mixed i16 and u8 comparison", `
i16 Signed = -1
u8 ByteValue = 2
u8 Result = 0
sub start:
  if Signed < ByteValue then Result = 1
  loop forever
end sub
`);
assert.doesNotMatch(mixedCompare, /AMY_CMP_(?:LEFT|RIGHT)32|AMY_CMP32/i,
  "mixed i16/u8 comparison should not promote to a 32-bit helper");

console.log("Porting-guide language contracts: PASS");
