import { checkDisplayGraphicsDeprecation } from "./deprecations.js";

export function handleDisplayGraphicsSpriteStatement({
  line,
  rawLine,
  preferScreenOnNoNmi,
  currentGraphicsMode,
  emitLoadInt8Into,
  emitLoadInt8ValueInto,
  tryEvaluateConstantExpression,
  formatHex16,
  makeGeneratedLabel
}) {
  const _dep = checkDisplayGraphicsDeprecation(line, rawLine);
  if (_dep.handled) return _dep;

  if (/^screen\s+off(\s+no\s+nmi)?$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_SCREEN_OFF_NO_NMI"] };
  }

  if (/^display\s+off$/i.test(line)) {
    return {
      ok: true,
      handled: true,
      lines: ["    ld a,($73C4)", "    and $BF", "    ld c,a", "    ld b,1", "    call WRITE_REGISTER"]
    };
  }

  if (/^display\s+on$/i.test(line)) {
    return {
      ok: true,
      handled: true,
      lines: ["    ld a,($73C4)", "    or $40", "    ld c,a", "    ld b,1", "    call WRITE_REGISTER"]
    };
  }

  if (/^graphics\s+(?:mode\s+)?bitmap$/i.test(line) || /^graphics\s+mode\s+2\s+bitmap$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_SET_BITMAP_GRAPHICS_MODE"] };
  }

  if (/^picture\s+screen$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_SET_BITMAP_GRAPHICS_MODE"] };
  }

  const bitmapScreen = line.match(/^bitmap\s+screen(?:\s+color\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?|\$[0-9A-Fa-f]+|[0-9]+))?$/i);
  if (bitmapScreen) {
    const loadColor = emitLoadInt8Into("a", bitmapScreen[1] || "$F0");
    if (!loadColor) {
      return { ok: false, handled: true, log: `bitmap screen color requires a byte literal or variable: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadColor, "    call AMY_SET_GRAPHICS_MODE1_BITMAP"] };
  }

  const graphicsMode1Bitmap = line.match(/^graphics\s+mode\s*1(?:\s+color\s+([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]+\])?|\$[0-9A-Fa-f]+|[0-9]+))?$/i);
  if (graphicsMode1Bitmap) {
    const loadColor = emitLoadInt8Into("a", graphicsMode1Bitmap[1] || "$F0");
    if (!loadColor) {
      return { ok: false, handled: true, log: `graphics mode1 color requires a byte literal or variable: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadColor, "    call AMY_SET_GRAPHICS_MODE1_BITMAP"] };
  }

  if (/^graphics\s+mode\s+1\s+text$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_SET_GRAPHICS_MODE1_TEXT"] };
  }

  if (/^graphics\s+mode\s+2\s+text$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_SET_GRAPHICS_MODE2_TEXT"] };
  }

  if (/^tile\s+screen$/i.test(line)) {
    return {
      ok: true,
      handled: true,
      lines: [
        "    call AMY_SET_GRAPHICS_MODE2_TEXT",
        "    call LOAD_ASCII",
        "    call AMY_DUPLICATE_PATTERN_THIRDS",
        "    ld a,$F0",
        "    call AMY_FILL_MODE2_TEXT_COLOR",
        "    ld hl,($73F6)",
        "    ld de,$0300",
        "    ld a,$20",
        "    call FILL_VRAM"
      ]
    };
  }

  if (/^graphics\s+(?:mode\s+3\s+)?multicolor$/i.test(line) || /^graphics\s+mode\s+3$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_SET_GRAPHICS_MODE3_MULTICOLOR"] };
  }

  if (/^multicolor\s+screen$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_SET_GRAPHICS_MODE3_MULTICOLOR"] };
  }

  if (/^text\s+40\s+screen$/i.test(line)) {
    return {
      ok: false,
      handled: true,
      log: `text 40 screen is reserved until Amy text I/O supports 40-column address math; use text screen for 32-column text: ${rawLine}`
    };
  }

  if (/^text\s+screen$/i.test(line)) {
    return {
      ok: true,
      handled: true,
      lines: [
        "    call AMY_SET_GRAPHICS_MODE1_TEXT",
        "    call LOAD_ASCII",
        "    ld a,$F0",
        "    ld hl,VRAM_COLOR",
        "    ld de,$0020",
        "    call AMY_FILL_VRAM"
      ]
    };
  }

  if (/^screen\s+on\s+no\s+nmi$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_SCREEN_ON_NO_NMI"] };
  }

  if (/^screen\s+on$/i.test(line)) {
    return { ok: true, handled: true, lines: [`    call ${preferScreenOnNoNmi ? "AMY_SCREEN_ON_NO_NMI" : "AMY_SCREEN_ON_NMI"}`] };
  }

  const setSpritePatternTable = line.match(/^set\s+sprite\s+pattern\s+table\s+vram\.(pattern|spr_pat)$/i);
  if (setSpritePatternTable) {
    const registerValue = setSpritePatternTable[1].toLowerCase() === "pattern" ? "$0600" : "$0607";
    return { ok: true, handled: true, lines: [`    ld bc,${registerValue}`, "    call WRITE_REGISTER"] };
  }

  if (/^(nmi\s+off|disable\s+nmi)$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_DISABLE_NMI"] };
  }

  if (/^(nmi\s+on|enable\s+nmi)$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_ENABLE_NMI"] };
  }

  if (/^cls$/i.test(line)) {
    if (currentGraphicsMode === "multicolor") {
      return {
        ok: true, handled: true,
        lines: ["    ld hl,VRAM_PATTERN", "    ld de,$0600", "    xor a", "    call FILL_VRAM"]
      };
    }
    if (currentGraphicsMode === "mode2_bitmap") {
      return {
        ok: true, handled: true,
        lines: [
          "    ld hl,VRAM_PATTERN", "    ld de,$1800", "    xor a", "    call FILL_VRAM",
          "    ld hl,VRAM_COLOR", "    ld de,$1800", "    ld a,$F0", "    call FILL_VRAM"
        ]
      };
    }
    if (currentGraphicsMode === "mode1_bitmap") {
      return {
        ok: true, handled: true,
        lines: [
          "    ld hl,VRAM_PATTERN", "    ld de,$0800", "    xor a", "    call FILL_VRAM",
          "    ld hl,VRAM_COLOR", "    ld de,$0020", "    ld a,$F0", "    call FILL_VRAM"
        ]
      };
    }
    return {
      ok: true, handled: true,
      lines: ["    ld hl,($73F6)", "    ld de,$0300", "    ld a,$20", "    call FILL_VRAM"]
    };
  }

  const loadDefaultAscii = line.match(/^load\s+default\s+ascii(?:\s+(normal|bold|italic|bold\s+italic|italic\s+bold))?$/i);
  if (loadDefaultAscii) {
    const style = (loadDefaultAscii[1] || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!style) {
      return { ok: true, handled: true, lines: ["    call LOAD_ASCII"] };
    }
    const styleFlags = style === "normal" ? "$00"
      : style === "italic" ? "$01"
      : style === "bold" ? "$02"
      : "$03";
    return { ok: true, handled: true, lines: [`    ld a,${styleFlags}`, "    call AMY_LOAD_DEFAULT_ASCII_STYLE"] };
  }

  const fillMode2TextColor = line.match(/^initialize\s+mode\s*2\s+text\s+color\s+with\s+(.+)$/i)
    || line.match(/^fill\s+mode\s*2\s+text\s+color\s+with\s+(.+)$/i)
    || line.match(/^fill\s+mode2\s+text\s+color\s+with\s+(.+)$/i);
  if (fillMode2TextColor) {
    const loadColor = emitLoadInt8ValueInto("a", fillMode2TextColor[1]);
    if (!loadColor) return { ok: false, handled: true, log: `Mode 2 text color must be a u8 value: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadColor, "    call AMY_FILL_MODE2_TEXT_COLOR"] };
  }

  const fillMode2TextColorFull = line.match(/^fill\s+full\s+mode\s*2\s+text\s+color\s+with\s+(.+)$/i)
    || line.match(/^fill\s+full\s+mode2\s+text\s+color\s+with\s+(.+)$/i)
    || line.match(/^initialize\s+full\s+mode\s*2\s+text\s+color\s+with\s+(.+)$/i);
  if (fillMode2TextColorFull) {
    const loadColor = emitLoadInt8ValueInto("a", fillMode2TextColorFull[1]);
    if (!loadColor) return { ok: false, handled: true, log: `Full Mode 2 text color must be a u8 value: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadColor, "    call AMY_FILL_MODE2_TEXT_COLOR_FULL"] };
  }

  if (/^duplicate\s+mode\s*2\s+text\s+pattern\s+thirds$/i.test(line) || /^duplicate\s+mode\s*2\s+text\s+patterns$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_DUPLICATE_PATTERN_THIRDS"] };
  }

  if (/^sprites\s+8x8$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_SET_SPRITES8X8"] };
  }
  if (/^sprites\s+16x16$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_SET_SPRITES16X16"] };
  }
  if (/^sprites\s+simple$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_SET_SPRITES_SIMPLE"] };
  }
  if (/^sprites\s+double$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_SET_SPRITES_DOUBLE"] };
  }

  const setSpriteCount = line.match(/^set\s+sprite\s+count\s+(?:to\s+)?(.+)$/i);
  if (setSpriteCount) {
    const loadCount = emitLoadInt8ValueInto("a", setSpriteCount[1]);
    if (!loadCount) return { ok: false, handled: true, log: `Sprite count must be a byte value: ${rawLine}` };
    return { ok: true, handled: true, lines: [...loadCount, "    ld (AMY_SPRITE_COUNT),a"] };
  }

  if (/^clear\s+sprites$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_CLEAR_SPRITES"] };
  }
  const clearSpritesRange = line.match(/^clear\s+sprites\s+from\s+(.+?)\s+count\s+(.+)$/i);
  if (clearSpritesRange) {
    const firstValue = tryEvaluateConstantExpression(clearSpritesRange[1]);
    const countValue = tryEvaluateConstantExpression(clearSpritesRange[2]);
    if (!Number.isInteger(firstValue) || !Number.isInteger(countValue)) {
      return { ok: false, handled: true, log: `clear sprites from/count currently requires constant sprite range values: ${rawLine}` };
    }
    if (firstValue < 0 || countValue < 0 || firstValue > 32 || firstValue + countValue > 32) {
      return { ok: false, handled: true, log: `clear sprites range must stay within sprite entries 0..31: ${rawLine}` };
    }
    const lines = [];
    for (let index = firstValue; index < firstValue + countValue; index += 1) {
      lines.push(`    ld a,${index}`);
      lines.push("    call AMY_HIDE_SPRITE");
    }
    return { ok: true, handled: true, lines };
  }
  if (/^update\s+sprites$/i.test(line)) {
    return { ok: true, handled: true, lines: ["    call AMY_UPDATE_SPRITES"] };
  }
  const updateSpritesRange = line.match(/^update\s+sprites\s+from\s+(.+?)\s+count\s+(.+)$/i);
  if (updateSpritesRange) {
    const firstValue = tryEvaluateConstantExpression(updateSpritesRange[1]);
    const countValue = tryEvaluateConstantExpression(updateSpritesRange[2]);
    if (!Number.isInteger(firstValue) || !Number.isInteger(countValue)) {
      return { ok: false, handled: true, log: `update sprites from/count currently requires constant sprite range values: ${rawLine}` };
    }
    if (firstValue < 0 || countValue < 0 || firstValue > 32 || firstValue + countValue > 32) {
      return { ok: false, handled: true, log: `update sprites range must stay within sprite entries 0..31: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        `    ld hl,AMY_SPRITE_TABLE+${firstValue * 4}`,
        `    ld de,${formatHex16(0x1B00 + firstValue * 4)}`,
        `    ld a,${countValue}`,
        "    call AMY_UPDATE_SPRITES_PARTIAL"
      ]
    };
  }

  const setSpritePattern = line.match(/^set\s+sprite\s+(.+?)\s+pattern\s+to\s+(.+)$/i);
  if (setSpritePattern) {
    const indexValue = tryEvaluateConstantExpression(setSpritePattern[1]);
    const loadPattern = emitLoadInt8ValueInto("a", setSpritePattern[2]);
    if (!Number.isInteger(indexValue) || indexValue < 0 || indexValue > 31 || !loadPattern) {
      return { ok: false, handled: true, log: `set sprite pattern requires a constant sprite index 0..31 and byte pattern value: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadPattern,
        `    ld (AMY_SPRITE_TABLE+${indexValue * 4 + 2}),a`
      ]
    };
  }

  const setSpritePatternBit = line.match(/^set\s+sprite\s+(.+?)\s+pattern\s+bit\s+(.+?)\s+(on|off)$/i);
  if (setSpritePatternBit) {
    const indexValue = tryEvaluateConstantExpression(setSpritePatternBit[1]);
    const bitValue = tryEvaluateConstantExpression(setSpritePatternBit[2]);
    if (!Number.isInteger(indexValue) || indexValue < 0 || indexValue > 31 || !Number.isInteger(bitValue) || bitValue < 0 || bitValue > 7) {
      return { ok: false, handled: true, log: `set sprite pattern bit requires constant sprite index 0..31 and bit 0..7: ${rawLine}` };
    }
    const mask = 1 << bitValue;
    const on = setSpritePatternBit[3].toLowerCase() === "on";
    return {
      ok: true,
      handled: true,
      lines: [
        `    ld a,(AMY_SPRITE_TABLE+${indexValue * 4 + 2})`,
        on ? `    or $${mask.toString(16).toUpperCase().padStart(2, "0")}` : `    and $${(0xFF ^ mask).toString(16).toUpperCase().padStart(2, "0")}`,
        `    ld (AMY_SPRITE_TABLE+${indexValue * 4 + 2}),a`
      ]
    };
  }

  const toggleSpritePatternBit = line.match(/^toggle\s+sprite\s+(.+?)\s+pattern\s+bit\s+(.+)$/i);
  if (toggleSpritePatternBit) {
    const indexValue = tryEvaluateConstantExpression(toggleSpritePatternBit[1]);
    const bitValue = tryEvaluateConstantExpression(toggleSpritePatternBit[2]);
    if (!Number.isInteger(indexValue) || indexValue < 0 || indexValue > 31 || !Number.isInteger(bitValue) || bitValue < 0 || bitValue > 7) {
      return { ok: false, handled: true, log: `toggle sprite pattern bit requires constant sprite index 0..31 and bit 0..7: ${rawLine}` };
    }
    const mask = 1 << bitValue;
    return {
      ok: true,
      handled: true,
      lines: [
        `    ld a,(AMY_SPRITE_TABLE+${indexValue * 4 + 2})`,
        `    xor $${mask.toString(16).toUpperCase().padStart(2, "0")}`,
        `    ld (AMY_SPRITE_TABLE+${indexValue * 4 + 2}),a`
      ]
    };
  }

  const moveSpriteTowardTile = line.match(/^move\s+sprite\s+(.+?)\s+toward\s+tile\s+(.+?)\s*,\s*(.+?)\s+step\s+(.+?)\s+wait\s+(.+?)\s+frames?(?:\s+animate\s+pattern\s+xor\s+(.+))?$/i);
  if (moveSpriteTowardTile) {
    const indexValue = tryEvaluateConstantExpression(moveSpriteTowardTile[1]);
    const stepValue = tryEvaluateConstantExpression(moveSpriteTowardTile[4]);
    const waitValue = tryEvaluateConstantExpression(moveSpriteTowardTile[5]);
    const animateValue = moveSpriteTowardTile[6] ? tryEvaluateConstantExpression(moveSpriteTowardTile[6]) : null;
    const loadTargetX = emitLoadInt8ValueInto("a", `(${moveSpriteTowardTile[2]}) << 3`);
    const loadTargetY = emitLoadInt8ValueInto("a", `((${moveSpriteTowardTile[3]}) << 3) - 1`);
    if (!Number.isInteger(indexValue) || indexValue < 0 || indexValue > 31
      || !Number.isInteger(stepValue) || stepValue <= 0 || stepValue > 8 || 8 % stepValue !== 0
      || !Number.isInteger(waitValue) || waitValue < 0 || waitValue > 255
      || (moveSpriteTowardTile[6] && (!Number.isInteger(animateValue) || animateValue < 0 || animateValue > 255))
      || !loadTargetX || !loadTargetY) {
      return {
        ok: false,
        handled: true,
        log: `move sprite toward tile requires constant sprite index, step divisor of 8, byte wait, optional byte xor mask, and byte tile coordinates: ${rawLine}`
      };
    }
    const loop = makeGeneratedLabel("SpriteMoveLoop");
    const checkY = makeGeneratedLabel("SpriteMoveCheckY");
    const incX = makeGeneratedLabel("SpriteMoveIncX");
    const stepDone = makeGeneratedLabel("SpriteMoveStepDone");
    const incY = makeGeneratedLabel("SpriteMoveIncY");
    const done = makeGeneratedLabel("SpriteMoveDone");
    const waitLoop = makeGeneratedLabel("SpriteMoveWait");
    const base = indexValue * 4;
    return {
      ok: true,
      handled: true,
      lines: [
        `${loop}:`,
        `    ld a,(AMY_SPRITE_TABLE+${base + 1})`,
        "    ld b,a",
        ...loadTargetX,
        "    cp b",
        `    jr z,${checkY}`,
        `    jr nc,${incX}`,
        `    ld a,(AMY_SPRITE_TABLE+${base + 1})`,
        `    sub ${stepValue}`,
        `    ld (AMY_SPRITE_TABLE+${base + 1}),a`,
        `    jr ${checkY}`,
        `${incX}:`,
        `    ld a,(AMY_SPRITE_TABLE+${base + 1})`,
        `    add a,${stepValue}`,
        `    ld (AMY_SPRITE_TABLE+${base + 1}),a`,
        `${checkY}:`,
        `    ld a,(AMY_SPRITE_TABLE+${base})`,
        "    ld b,a",
        ...loadTargetY,
        "    cp b",
        `    jr z,${stepDone}`,
        `    jr nc,${incY}`,
        `    ld a,(AMY_SPRITE_TABLE+${base})`,
        `    sub ${stepValue}`,
        `    ld (AMY_SPRITE_TABLE+${base}),a`,
        `    jr ${stepDone}`,
        `${incY}:`,
        `    ld a,(AMY_SPRITE_TABLE+${base})`,
        `    add a,${stepValue}`,
        `    ld (AMY_SPRITE_TABLE+${base}),a`,
        `${stepDone}:`,
        ...(waitValue > 0 ? [
          `    ld b,${waitValue}`,
          `${waitLoop}:`,
          "    halt",
          `    djnz ${waitLoop}`
        ] : []),
        ...(moveSpriteTowardTile[6] ? [
          `    ld a,(AMY_SPRITE_TABLE+${base + 2})`,
          `    xor $${animateValue.toString(16).toUpperCase().padStart(2, "0")}`,
          `    ld (AMY_SPRITE_TABLE+${base + 2}),a`
        ] : []),
        "    call AMY_UPDATE_SPRITES",
        `    ld a,(AMY_SPRITE_TABLE+${base + 1})`,
        "    ld b,a",
        ...loadTargetX,
        "    cp b",
        `    jr nz,${loop}`,
        `    ld a,(AMY_SPRITE_TABLE+${base})`,
        "    ld b,a",
        ...loadTargetY,
        "    cp b",
        `    jr nz,${loop}`,
        `${done}:`
      ]
    };
  }

  const setSpriteTile = line.match(/^set\s+sprite\s+(.+?)\s+tile\s+(.+?)\s*,\s*(.+?)\s+pattern\s+(.+?)\s+color\s+(.+?)(?:\s+offset\s+(.+?)\s*,\s*(.+))?$/i);
  if (setSpriteTile) {
    const offsetX = setSpriteTile[6] ? setSpriteTile[6].trim() : "0";
    const offsetY = setSpriteTile[7] ? setSpriteTile[7].trim() : "0";
    const xExpr = offsetX === "0" ? `(${setSpriteTile[2]}) << 3` : `((${setSpriteTile[2]}) << 3) + (${offsetX})`;
    const yExpr = offsetY === "0" ? `((${setSpriteTile[3]}) << 3) - 1` : `(((${setSpriteTile[3]}) << 3) - 1) + (${offsetY})`;
    const loadIndex = emitLoadInt8ValueInto("a", setSpriteTile[1]);
    const loadY = emitLoadInt8ValueInto("a", yExpr);
    const loadX = emitLoadInt8ValueInto("a", xExpr);
    const loadPattern = emitLoadInt8ValueInto("a", setSpriteTile[4]);
    const loadColor = emitLoadInt8ValueInto("a", setSpriteTile[5]);
    if (!loadIndex || !loadY || !loadX || !loadPattern || !loadColor) {
      return { ok: false, handled: true, log: `set sprite tile requires byte-sized index/tile coordinates/pattern/color: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadY,
        "    push af",
        ...loadX,
        "    push af",
        ...loadPattern,
        "    push af",
        ...loadColor,
        "    push af",
        ...loadIndex,
        "    pop hl",
        "    ld e,h",
        "    pop hl",
        "    ld d,h",
        "    pop hl",
        "    ld c,h",
        "    pop hl",
        "    ld b,h",
        "    call AMY_SET_SPRITE"
      ]
    };
  }

  const setSprite = line.match(/^set\s+sprite\s+(.+?)\s+to\s+(.+?)\s*,\s*(.+?)\s*,\s*(.+?)\s*,\s*(.+?)$/i);
  if (setSprite) {
    const indexValue = tryEvaluateConstantExpression(setSprite[1]);
    const yValue = tryEvaluateConstantExpression(setSprite[2]);
    const xValue = tryEvaluateConstantExpression(setSprite[3]);
    const patternValue = tryEvaluateConstantExpression(setSprite[4]);
    const colorValue = tryEvaluateConstantExpression(setSprite[5]);
    const allSpriteConstants = [indexValue, yValue, xValue, patternValue, colorValue]
      .every((value) => Number.isInteger(value) && value >= 0 && value <= 0xFF);
    if (allSpriteConstants) {
      return {
        ok: true,
        handled: true,
        lines: [
          `    ld bc,${formatHex16(((yValue & 0xFF) << 8) | (xValue & 0xFF))}`,
          `    ld de,${formatHex16(((patternValue & 0xFF) << 8) | (colorValue & 0xFF))}`,
          ...emitLoadInt8ValueInto("a", setSprite[1]),
          "    call AMY_SET_SPRITE"
        ]
      };
    }
    const loadIndex = emitLoadInt8ValueInto("a", setSprite[1]);
    const loadY = emitLoadInt8ValueInto("a", setSprite[2]);
    const loadX = emitLoadInt8ValueInto("a", setSprite[3]);
    const loadPattern = emitLoadInt8ValueInto("a", setSprite[4]);
    const loadColor = emitLoadInt8ValueInto("a", setSprite[5]);
    if (!loadIndex || !loadY || !loadX || !loadPattern || !loadColor) {
      return { ok: false, handled: true, log: `set sprite requires byte-sized index/values or constant expressions: ${rawLine}` };
    }
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadY,
        "    push af",
        ...loadX,
        "    push af",
        ...loadPattern,
        "    push af",
        ...loadColor,
        "    push af",
        ...loadIndex,
        "    pop hl",
        "    ld e,h",
        "    pop hl",
        "    ld d,h",
        "    pop hl",
        "    ld c,h",
        "    pop hl",
        "    ld b,h",
        "    call AMY_SET_SPRITE"
      ]
    };
  }

  const hideSprite = line.match(/^hide\s+sprite\s+(.+)$/i);
  if (hideSprite) {
    const loadIndex = emitLoadInt8ValueInto("a", hideSprite[1]);
    if (!loadIndex) {
      return { ok: false, handled: true, log: `hide sprite requires a byte-sized index: ${rawLine}` };
    }
    return { ok: true, handled: true, lines: [...loadIndex, "    call AMY_HIDE_SPRITE"] };
  }

  return { handled: false };
}
