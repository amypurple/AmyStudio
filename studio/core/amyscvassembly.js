import { Directive, Instruction, Lexer, NumberParser, Operand } from "../vendor/amyscvassembly/parserCore.js";

export { Directive, Instruction, Lexer, NumberParser, Operand };

export function lexZ80Source(sourceText) {
  const lexer = new Lexer();
  return lexer.tokenize(sourceText || "");
}

export function parseAssemblyNumber(value) {
  return new NumberParser().parseNumber(value);
}

export function summarizeTokens(tokens) {
  return {
    instructions: tokens.filter((token) => token instanceof Instruction).length,
    directives: tokens.filter((token) => token instanceof Directive).length,
    total: tokens.length
  };
}

