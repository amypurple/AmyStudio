import assert from "node:assert/strict";
import { tokenizeAmyLine, tokenizeAmySource } from "../studio/core/editor/amySyntaxTokenizer.js";

const compact = (tokens) => tokens.map(({ type, text }) => [type, text]);

assert.deepEqual(compact(tokenizeAmyLine("u8 X = $2A").tokens), [
  ["type", "u8"],
  ["plain", " "],
  ["identifier", "X"],
  ["plain", " "],
  ["operator", "="],
  ["plain", " "],
  ["number", "$2A"]
]);

assert.deepEqual(compact(tokenizeAmyLine("print \"Amy\" ' note").tokens), [
  ["keyword", "print"],
  ["plain", " "],
  ["string", "\"Amy\""],
  ["plain", " "],
  ["comment", "' note"]
]);

const asm = tokenizeAmySource("asm {\n  ld a,$20\n}\nprint whole X");
assert.equal(asm[0].at(-1).type, "asm");
assert.equal(asm[1][0].type, "asm");
assert.equal(asm[2][0].type, "asm");
assert.deepEqual(compact(asm[3]), [
  ["keyword", "print"],
  ["plain", " "],
  ["builtin", "whole"],
  ["plain", " "],
  ["identifier", "X"]
]);

assert.equal(tokenizeAmyLine("ifdef DEBUG").tokens[0].type, "directive");
assert.equal(tokenizeAmyLine("fixed Speed = 1.25").tokens[0].type, "type");
for (const word of ["picture", "codec", "vpoke", "choose", "sprite16"]) {
  assert.notEqual(tokenizeAmyLine(word).tokens[0].type, "identifier", word + " should be colored");
}
assert.equal(tokenizeAmyLine("if X <= -1 then").tokens.map((token) => token.text).join(""), "if X <= -1 then");
assert.equal(tokenizeAmyLine('project "My Game"').tokens[0].type, "directive");
assert.equal(tokenizeAmyLine('cartridge "GAME/AMY/2026"').tokens[0].type, "directive");
assert.equal(tokenizeAmyLine('memory "colecovision_legacy_sdcc"').tokens[0].type, "directive");
assert.equal(tokenizeAmyLine("wait 25 frames").tokens.at(-1).type, "unit");
assert.equal(tokenizeAmyLine("put Frames frame size 4,4 at X,Y").tokens.find((token) => token.text === "frame").type, "keyword");
assert.equal(tokenizeAmyLine("move sprite 0 wait 3 frames").tokens.at(-1).type, "unit");
assert.equal(tokenizeAmyLine("u8 Project = 0").tokens[2].type, "identifier");
assert.equal(tokenizeAmyLine("Project = 1").tokens[0].type, "identifier");
assert.equal(tokenizeAmyLine("u8 Color = 0").tokens[2].type, "identifier");
assert.equal(tokenizeAmyLine("Value = Values[Index + 1]").tokens.find((token) => token.text.includes("[")).type, "operator");

const pictureTokens = tokenizeAmySource("picture Title:\n  pattern TitlePattern\n  color TitleColor\n  name TitleName\nend picture");
assert.equal(pictureTokens[1].find((token) => token.text === "pattern").type, "vdp");
assert.equal(pictureTokens[2].find((token) => token.text === "color").type, "vdp");
assert.equal(pictureTokens[3].find((token) => token.text === "name").type, "vdp");
assert.equal(tokenizeAmyLine("copy Data to vram.pattern").tokens.at(-1).type, "vdp");
assert.equal(tokenizeAmyLine("Player.Color = 1").tokens.find((token) => token.text === "Color").type, "identifier");

const identifierLegalWords = [
  "Count", "Str", "Whole", "Peek", "Line", "Circle", "Plot", "Pset", "Set", "From",
  "By", "At", "With", "Between", "Pause", "Repeat", "Ref", "Raw", "Forever"
];
for (const name of identifierLegalWords) {
  const declaration = tokenizeAmyLine(`u8 ${name} = 0`).tokens.find((token) => token.text === name);
  const assignment = tokenizeAmyLine(`${name} = 1`).tokens.find((token) => token.text === name);
  assert.equal(declaration?.type, "identifier", `${name} declaration must stay neutral`);
  assert.equal(assignment?.type, "identifier", `${name} assignment must stay neutral`);
  const expression = tokenizeAmyLine(`Value = ${name} + 1`).tokens.find((token) => token.text === name);
  assert.equal(expression?.type, "identifier", `${name} expression use must stay neutral`);
}

assert.equal(tokenizeAmyLine("peek(Address)").tokens[0].type, "builtin");
assert.equal(tokenizeAmyLine("count(Actors)").tokens[0].type, "builtin");
assert.equal(tokenizeAmyLine("copy Data count 8 to vram.name").tokens.find((token) => token.text === "count").type, "keyword");
assert.equal(tokenizeAmyLine("backdrop sky blue").tokens[0].type, "keyword");
assert.equal(tokenizeAmyLine("timer Blink every 5 ticks").tokens[0].type, "keyword");
assert.equal(tokenizeAmyLine("timer Blink every 5 ticks").tokens.at(-1).type, "unit");
assert.equal(tokenizeAmyLine("Sprites = Color + 1").tokens.find((token) => token.text === "Color").type, "identifier");
assert.equal(tokenizeAmyLine("set sprite 0 color 15").tokens.find((token) => token.text === "color").type, "vdp");
for (const state of ["on", "off"]) {
  assert.equal(tokenizeAmyLine("nmi " + state).tokens.find((token) => token.text === state).type, "vdp");
}
assert.equal(tokenizeAmyLine("u8 Off = 0").tokens.find((token) => token.text === "Off").type, "identifier");
assert.equal(tokenizeAmyLine("On = 1").tokens.find((token) => token.text === "On").type, "identifier");

console.log("Amy syntax tokenizer: PASS");
