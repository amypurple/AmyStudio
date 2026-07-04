export function transpileAmySource({ sourceLang, sourceText, transpileAmy }) {
  if (sourceLang === "amy") {
    return transpileAmy(sourceText);
  }

  if (sourceLang === "z80_asm") {
    const instructions = String(sourceText || "")
      .split(/\r?\n/)
      .filter((line) => {
        const trimmed = line.replace(/;.*/, "").trim();
        return trimmed && !trimmed.endsWith(":") && !/^\.[A-Za-z]/.test(trimmed);
      }).length;
    const directives = String(sourceText || "")
      .split(/\r?\n/)
      .filter((line) => /^\s*\.[A-Za-z]/.test(line.replace(/;.*/, ""))).length;
    return {
      ok: true,
      asmBody: sourceText,
      assets: [],
      metadata: {},
      ramUsage: null,
      log: `Source language is Z80 ASM; quick scan found ${instructions} instructions and ${directives} directives.`
    };
  }

  return { ok: false, asmBody: "", assets: [], metadata: {}, ramUsage: null, log: `Unknown source language: ${sourceLang}` };
}
