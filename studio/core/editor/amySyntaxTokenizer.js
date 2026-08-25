import { matchAmyPhraseRanges } from "./amyGrammar.js";

const KEYWORDS = new Set([
  "and", "as", "asm", "asset", "at", "between", "bind", "bitmap", "by", "call", "cartridge",
  "case", "choose", "clear", "cls", "codec", "const", "continue", "copy", "data",
  "decompress", "default", "define", "dim", "disable", "display", "do", "downto",
  "each", "else", "elseif", "enable", "end", "endif", "exit", "false", "fill", "fire",
  "for", "forever", "frame", "from", "function", "goto", "graphics", "hide",
  "hitbox", "if", "in", "include", "label", "let", "local", "loop", "memory", "mute",
  "next", "nmi", "not", "on", "or", "overlay", "pause", "picture", "play", "print", "put",
  "ram", "raw", "read", "record", "ref", "repeat", "reset", "restore", "return",
  "screen", "select", "set", "show", "song", "sound", "sprite", "sprite16",
  "sprites", "spinners", "status", "step", "stop", "sub", "swap", "text", "then",
  "to", "true", "until", "update", "var", "vdp", "vpoke", "vpeek", "vram", "wait",
  "wend", "while", "wipe", "with", "xor"
]);

const TYPES = new Set([
  "bcd", "bool", "byte", "fixed", "fp5", "i8", "i16", "i32", "sbyte", "u8",
  "u16", "u32", "ufixed", "word"
]);

const BUILTINS = new Set([
  "count", "highbyte", "joypad", "keypad", "lowbyte", "peek", "random", "spinner",
  "str", "whole"
]);

const METADATA = new Set(["project", "cartridge", "memory"]);

const STATEMENT_KEYWORDS = new Set([
  "backdrop", "dispatch", "duplicate", "load", "merge", "timer"
]);

const QUALIFIER_KEYWORDS = new Set([
  "after", "areas", "at", "between", "by", "calls", "count", "digits", "downto", "every",
  "from", "mask", "mode", "raw", "ref", "repeat", "step", "to", "using", "width", "with"
]);

const TIME_UNITS = new Set(["frame", "frames", "seconds", "tick", "ticks"]);

const CONTEXTUAL_IDENTIFIERS = new Set([
  "at", "between", "by", "circle", "count", "forever", "from", "line", "pause",
  "peek", "plot", "pset", "raw", "ref", "repeat", "set", "str", "whole", "with"
]);

const VDP_KEYWORDS = new Set([
  "bitmap", "circle", "cls", "display", "graphics", "hitbox", "line", "nmi",
  "picture", "plot", "preset", "pset", "screen", "show", "sprite", "sprite16",
  "sprites", "vdp", "vpoke", "vpeek", "vram", "wipe"
]);

const VDP_PROPERTIES = new Set([
  "attribute", "attributes", "color", "colors", "name", "pattern", "patterns"
]);
const DIRECTIVES = new Set([
  "defined", "elsedef", "ifdef", "ifndef"
]);

function classifyWord(word, context = {}) {
  const lower = word.toLowerCase();
  if (context.identifierRole) return "identifier";
  if (context.metadata && METADATA.has(lower)) return "directive";
  if (context.timeUnit && TIME_UNITS.has(lower)) return "unit";
  if (context.vdpProperty && VDP_PROPERTIES.has(lower)) return "vdp";
  if (context.vdpToggle) return "vdp";
  if (TYPES.has(lower)) return "type";
  if (DIRECTIVES.has(lower)) return "directive";
  if (context.builtinCall && BUILTINS.has(lower)) return "builtin";
  if (VDP_KEYWORDS.has(lower)) return context.statementPosition || !CONTEXTUAL_IDENTIFIERS.has(lower) ? "vdp" : "identifier";
  if (STATEMENT_KEYWORDS.has(lower)) return context.statementPosition ? "keyword" : "identifier";
  if (QUALIFIER_KEYWORDS.has(lower)) {
    const active = CONTEXTUAL_IDENTIFIERS.has(lower) ? context.contextualKeyword : context.qualifierPosition;
    return active ? "keyword" : "identifier";
  }
  if ((TIME_UNITS.has(lower) && !KEYWORDS.has(lower)) || METADATA.has(lower)) return "identifier";
  if (CONTEXTUAL_IDENTIFIERS.has(lower)) return context.contextualKeyword ? "keyword" : "identifier";
  if (KEYWORDS.has(lower)) return "keyword";
  return "identifier";
}
function push(tokens, type, text) {
  if (!text) return;
  const previous = tokens[tokens.length - 1];
  if (previous?.type === type) previous.text += text;
  else tokens.push({ type, text });
}

export function tokenizeAmyLine(sourceLine, previousState = {}) {
  const line = String(sourceLine ?? "");
  const tokens = [];
  const phraseRanges = matchAmyPhraseRanges(line);
  const phraseRangeAt = (position) => phraseRanges.find(({ start }) => start === position);
  let index = 0;
  let inAsmBlock = Boolean(previousState.inAsmBlock);
  let inPictureBlock = Boolean(previousState.inPictureBlock);
  const trimmedLower = line.trimStart().toLowerCase();
  const metadataDirective = /^(?:project|cartridge|memory)\s+"/.test(trimmedLower);

  while (index < line.length) {
    const rest = line.slice(index);

    if (inAsmBlock) {
      const closeIndex = rest.indexOf("}");
      if (closeIndex < 0) {
        push(tokens, "asm", rest);
        index = line.length;
        break;
      }
      push(tokens, "asm", rest.slice(0, closeIndex + 1));
      index += closeIndex + 1;
      inAsmBlock = false;
      continue;
    }

    if (line[index] === "'") {
      push(tokens, "comment", rest);
      break;
    }

    if (line[index] === '"') {
      let end = index + 1;
      while (end < line.length) {
        if (line[end] === '"' && line[end + 1] === '"') {
          end += 2;
          continue;
        }
        if (line[end] === '"') {
          end += 1;
          break;
        }
        end += 1;
      }
      push(tokens, "string", line.slice(index, end));
      index = end;
      continue;
    }

    const whitespace = /^[ \t]+/.exec(rest);
    if (whitespace) {
      push(tokens, "plain", whitespace[0]);
      index += whitespace[0].length;
      continue;
    }

    const phraseRange = phraseRangeAt(index);
    if (phraseRange) {
      push(tokens, phraseRange.type, line.slice(phraseRange.start, phraseRange.end));
      index = phraseRange.end;
      continue;
    }

    const number = /^(?:\$[0-9A-Fa-f]+|%[01]+|(?:\d+(?:\.\d*)?|\.\d+))/.exec(rest);
    if (number) {
      push(tokens, "number", number[0]);
      index += number[0].length;
      continue;
    }

    const word = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
    if (word) {
      const significant = tokens.filter((token) => token.type !== "plain");
      const previous = significant[significant.length - 1];
      const isFirstWord = significant.length === 0;
      const lowerWord = word[0].toLowerCase();
      const nextSource = line.slice(index + word[0].length);
      const nextNonspace = nextSource.trimStart();
      const previousWord = previous?.text?.toLowerCase?.() || "";
      const firstWord = significant.find((token) => /^[A-Za-z_]/.test(token.text))?.text?.toLowerCase?.() || lowerWord;
      const statementPosition = isFirstWord || ["then", "else", ":"].includes(previousWord);
      const declarationTarget = previous?.type === "type";
      const assignmentTarget = /^(?:=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<=|>>=)/.test(nextNonspace);
      const fieldName = previous?.type === "operator" && previous.text.endsWith(".");
      const pictureProperty = inPictureBlock && isFirstWord && VDP_PROPERTIES.has(lowerWord);
      const dottedVdpProperty = fieldName
        && ["vram", "vdp"].includes(significant[significant.length - 2]?.text.toLowerCase());
      const spriteProperty = VDP_PROPERTIES.has(lowerWord)
        && ["set", "put", "move"].includes(firstWord)
        && significant.some((token) => ["sprite", "sprites"].includes(token.text.toLowerCase()));
      const vdpToggle = ["on", "off"].includes(lowerWord)
        && ["nmi", "screen", "display"].includes(firstWord);
      const builtinCall = /^\s*\$?\(/.test(nextSource)
        || (lowerWord === "whole" && /^\s+[A-Za-z_(.$]/.test(nextSource));
      const qualifierPosition = !statementPosition && !declarationTarget && !assignmentTarget
        && significant.length > 0;
      const contextualQualifier = (
        (lowerWord === "count" && ["copy", "data", "fill", "merge", "put"].includes(firstWord))
        || (lowerWord === "at" && ["print", "put", "set"].includes(firstWord))
        || (lowerWord === "from" && ["asset", "copy", "load"].includes(firstWord))
        || (lowerWord === "by" && ["bounce", "decay", "move"].includes(firstWord))
        || (lowerWord === "with" && ["call", "fill", "set"].includes(firstWord))
        || (lowerWord === "between" && ["bounce", "clamp"].includes(firstWord))
        || (lowerWord === "ref" && ["sub", "function"].includes(firstWord))
        || (lowerWord === "raw" && previous?.type === "operator" && previous.text.includes("=")
          && /^\s+[A-Za-z_][A-Za-z0-9_]*\s*\[/.test(nextSource))
        || (lowerWord === "repeat" && ["copy", "fill"].includes(firstWord))
      );
      const contextualKeyword = statementPosition
        || contextualQualifier
        || (lowerWord === "forever" && firstWord === "loop");
      const type = classifyWord(word[0], {
        identifierRole: declarationTarget || assignmentTarget || (fieldName && !dottedVdpProperty),
        metadata: isFirstWord && metadataDirective,
        timeUnit: TIME_UNITS.has(lowerWord)
          && significant.some((token) => ["wait", "pause", "every", "after"].includes(token.text.toLowerCase())),
        vdpProperty: pictureProperty || dottedVdpProperty || spriteProperty,
        vdpToggle,
        builtinCall,
        qualifierPosition,
        statementPosition,
        contextualKeyword
      });
      push(tokens, type, word[0]);
      index += word[0].length;
      if (word[0].toLowerCase() === "asm") {
        const after = line.slice(index);
        const open = /^\s*\{/.exec(after);
        if (open) {
          push(tokens, "plain", open[0].slice(0, -1));
          push(tokens, "asm", "{");
          index += open[0].length;
          inAsmBlock = true;
        }
      }
      continue;
    }

    if (/^[=<>+\-*/%&|^(),.:{}\[\]]/.test(rest)) {
      push(tokens, "operator", line[index]);
    } else {
      push(tokens, "plain", line[index]);
    }
    index += 1;
  }

  if (/^picture\b.*:\s*$/i.test(line.trim())) inPictureBlock = true;
  if (/^end\s+picture\b/i.test(line.trim())) inPictureBlock = false;
  return { tokens, state: { inAsmBlock, inPictureBlock } };
}

export function tokenizeAmySource(source) {
  const lines = String(source ?? "").split("\n");
  const result = [];
  let state = { inAsmBlock: false, inPictureBlock: false };
  for (const line of lines) {
    const tokenized = tokenizeAmyLine(line, state);
    result.push(tokenized.tokens);
    state = tokenized.state;
  }
  return result;
}
