export class Z80NumberParser {
  constructor() {
    this.defaultRadix = 10;
  }

  parseNumber(value) {
    if (!value) return null;

    const text = value.trim();
    if (!text) return null;

    if (/[\+\*\/\&\|\^\~\<\>\=\!]/.test(text) || /-/.test(text.substring(1))) {
      return null;
    }

    if (text.startsWith("$") && text.length > 1 && /^[0-9a-fA-F]+$/.test(text.substring(1))) {
      return parseInt(text.substring(1), 16);
    }

    if (/^0x[0-9a-f]+$/i.test(text)) return parseInt(text, 16);
    if (/^0b[01]+$/i.test(text)) return parseInt(text.substring(2), 2);
    if (/^0[0-7]+$/.test(text)) return parseInt(text, 8);
    if (/^%[01]+$/.test(text)) return parseInt(text.substring(1), 2);
    if (/^[0-9a-f]+h$/i.test(text)) return parseInt(text.slice(0, -1), 16);
    if (/^[01]+b$/i.test(text)) return parseInt(text.slice(0, -1), 2);
    if (/^[0-7]+o$/i.test(text)) return parseInt(text.slice(0, -1), 8);
    if (/^\d+$/.test(text)) return parseInt(text, this.defaultRadix);

    return null;
  }
}

export function parseZ80Number(value) {
  return new Z80NumberParser().parseNumber(value);
}

