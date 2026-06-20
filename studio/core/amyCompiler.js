export function transpileAmySource({ sourceLang, sourceText, transpileAmy, lexZ80Source, summarizeTokens }) {
  if (sourceLang === "amy") {
    return transpileAmy(sourceText);
  }

  if (sourceLang === "z80_asm") {
    const summary = summarizeTokens(lexZ80Source(sourceText));
    return {
      ok: true,
      asmBody: sourceText,
      assets: [],
      metadata: {},
      ramUsage: null,
      log: `Source language is Z80 ASM; lexer found ${summary.instructions} instructions and ${summary.directives} directives.`
    };
  }

  return { ok: false, asmBody: "", assets: [], metadata: {}, ramUsage: null, log: `Unknown source language: ${sourceLang}` };
}
