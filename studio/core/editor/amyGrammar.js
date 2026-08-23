export const AMY_FIXED_PHRASES = Object.freeze([
  ["text screen","vdp"],["tile screen","vdp"],["bitmap screen","vdp"],["multicolor screen","vdp"],["picture screen","vdp"],
  ["screen on","vdp"],["screen off","vdp"],["display on","vdp"],["display off","vdp"],["nmi on","vdp"],["nmi off","vdp"],
  ["swap screens","vdp"],["sprites simple","vdp"],["sprites double","vdp"],["sprites magnified","vdp"],
  ["wait fire","keyword"],["wait no fire","keyword"],["pause until press","keyword"],["pause until press and release","keyword"],
  ["sound runtime on","keyword"],["sound runtime off","keyword"],["stop all","keyword"],["mute all","keyword"],["loop forever","keyword"],
  ["state machine","keyword"],["end state machine","keyword"],
  ["end sub","keyword"],["end function","keyword"],["end if","keyword"],["end select","keyword"],["end with","keyword"],["end record","keyword"],["end data","keyword"],["end picture","keyword"]
].map(([phrase,type]) => ({ phrase, words: phrase.split(" "), type })));
export const AMY_MODE_PHRASES = Object.freeze(["8x8","16x16"]);
const MODE_MATCHER = /^(\s*)(sprites)(\s+)(8x8|16x16)\b/i;
const FIXED_BY_LEAD = new Map();
for (const entry of AMY_FIXED_PHRASES) {
  const entries = FIXED_BY_LEAD.get(entry.words[0]) || [];
  entries.push(entry);
  entries.sort((a, b) => b.words.length - a.words.length);
  FIXED_BY_LEAD.set(entry.words[0], entries);
}
export function matchAmyPhraseRanges(line) {
  const source = String(line ?? "");
  const mode = MODE_MATCHER.exec(source);
  if (mode) {
    const leadStart = mode[1].length;
    const literalStart = leadStart + mode[2].length + mode[3].length;
    return [
      { start: leadStart, end: leadStart + mode[2].length, type: "vdp" },
      { start: literalStart, end: literalStart + mode[4].length, type: "number" }
    ];
  }
  const offset = source.search(/\S/);
  if (offset < 0) return [];
  const lower = source.toLowerCase();
  const trimmed = lower.slice(offset);
  const lead = /^[a-z_][a-z0-9_]*/.exec(trimmed)?.[0];
  const entry = (FIXED_BY_LEAD.get(lead) || []).find(({ phrase }) =>
    trimmed === phrase || (trimmed.startsWith(phrase) && /\s|'/.test(trimmed[phrase.length] || ""))
  );
  if (!entry) return [];
  let cursor = offset;
  return entry.words.map((word) => {
    const start = lower.indexOf(word, cursor);
    cursor = start + word.length;
    return { start, end: cursor, type: entry.type };
  });
}
