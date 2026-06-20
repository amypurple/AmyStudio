export function handleSpecialIfGotoStatement({
  line,
  rawLine,
  resolveSourceJumpTarget,
  formatUnknownJumpTargetLog,
  emitConditionalJump,
  normalizeExpression,
  getRuntimeInfo,
  emitLoadInt8Into
}) {
  const ifVarGoto = line.match(/^if\s+(not\s+)?([A-Za-z_][A-Za-z0-9_]*)\s+(?:then\s+)?goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (ifVarGoto) {
    const jumpTarget = resolveSourceJumpTarget(ifVarGoto[3]);
    if (!jumpTarget) return { ok: false, handled: true, log: formatUnknownJumpTargetLog(ifVarGoto[3], rawLine) };
    const code = emitConditionalJump(`${ifVarGoto[1] || ""}${ifVarGoto[2]}`, jumpTarget);
    if (!code.ok) return { ok: false, handled: true, log: code.log };
    return { ok: true, handled: true, lines: code.lines };
  }

  const ifAnyCollisionGoto = line.match(/^if\s+(not\s+)?any\s+collision\s+(?:then\s+)?goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (ifAnyCollisionGoto) {
    const jumpTarget = resolveSourceJumpTarget(ifAnyCollisionGoto[2]);
    if (!jumpTarget) return { ok: false, handled: true, log: formatUnknownJumpTargetLog(ifAnyCollisionGoto[2], rawLine) };
    const code = emitConditionalJump(`${ifAnyCollisionGoto[1] || ""}any collision`, jumpTarget);
    if (!code.ok) return { ok: false, handled: true, log: code.log };
    return { ok: true, handled: true, lines: code.lines };
  }

  const ifSpriteHitboxCollisionGoto = line.match(/^if\s+sprite\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+hitbox\s+([A-Za-z_][A-Za-z0-9_]*)\s+collides\s+with\s+sprite\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+hitbox\s+([A-Za-z_][A-Za-z0-9_]*)\s+(?:then\s+)?goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (ifSpriteHitboxCollisionGoto) {
    const jumpTarget = resolveSourceJumpTarget(ifSpriteHitboxCollisionGoto[5]);
    if (!jumpTarget) return { ok: false, handled: true, log: formatUnknownJumpTargetLog(ifSpriteHitboxCollisionGoto[5], rawLine) };
    const code = emitConditionalJump(
      `sprite ${ifSpriteHitboxCollisionGoto[1]} hitbox ${ifSpriteHitboxCollisionGoto[2]} collides with sprite ${ifSpriteHitboxCollisionGoto[3]} hitbox ${ifSpriteHitboxCollisionGoto[4]}`,
      jumpTarget
    );
    if (!code.ok) return { ok: false, handled: true, log: code.log };
    return { ok: true, handled: true, lines: code.lines };
  }

  const ifSpriteCollisionGoto = line.match(/^if\s+sprite\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+collides\s+with\s+sprite\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+box\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+(?:then\s+)?goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (ifSpriteCollisionGoto) {
    const jumpTarget = resolveSourceJumpTarget(ifSpriteCollisionGoto[5]);
    if (!jumpTarget) return { ok: false, handled: true, log: formatUnknownJumpTargetLog(ifSpriteCollisionGoto[5], rawLine) };
    const code = emitConditionalJump(
      `sprite ${ifSpriteCollisionGoto[1]} collides with sprite ${ifSpriteCollisionGoto[2]} box ${ifSpriteCollisionGoto[3]},${ifSpriteCollisionGoto[4]}`,
      jumpTarget
    );
    if (!code.ok) return { ok: false, handled: true, log: code.log };
    return { ok: true, handled: true, lines: code.lines };
  }

  const ifSpriteCollisionRectGoto = line.match(/^if\s+sprite\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+collides\s+with\s+sprite\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+box\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+size\s+([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*|\$[0-9A-Fa-f]+|[0-9]+)\s+(?:then\s+)?goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (ifSpriteCollisionRectGoto) {
    const jumpTarget = resolveSourceJumpTarget(ifSpriteCollisionRectGoto[7]);
    if (!jumpTarget) return { ok: false, handled: true, log: formatUnknownJumpTargetLog(ifSpriteCollisionRectGoto[7], rawLine) };
    const code = emitConditionalJump(
      `sprite ${ifSpriteCollisionRectGoto[1]} collides with sprite ${ifSpriteCollisionRectGoto[2]} box ${ifSpriteCollisionRectGoto[3]},${ifSpriteCollisionRectGoto[4]} size ${ifSpriteCollisionRectGoto[5]},${ifSpriteCollisionRectGoto[6]}`,
      jumpTarget
    );
    if (!code.ok) return { ok: false, handled: true, log: code.log };
    return { ok: true, handled: true, lines: code.lines };
  }

  const ifTileUnderGoto = line.match(/^if\s+(tile\s+under\s+.+?\s*,\s*.+?\s+is\s+[A-Za-z_][A-Za-z0-9_]*)\s+(?:then\s+)?goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (ifTileUnderGoto) {
    const jumpTarget = resolveSourceJumpTarget(ifTileUnderGoto[2]);
    if (!jumpTarget) return { ok: false, handled: true, log: formatUnknownJumpTargetLog(ifTileUnderGoto[2], rawLine) };
    const code = emitConditionalJump(ifTileUnderGoto[1], jumpTarget);
    if (!code.ok) return { ok: false, handled: true, log: code.log };
    return { ok: true, handled: true, lines: code.lines };
  }

  const ifTilesUnderBoxGoto = line.match(/^if\s+(tiles\s+under\s+box\s+.+?\s*,\s*.+?\s+size\s+.+?\s*,\s*.+?\s+contain(?:s)?\s+[A-Za-z_][A-Za-z0-9_]*)\s+(?:then\s+)?goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (ifTilesUnderBoxGoto) {
    const jumpTarget = resolveSourceJumpTarget(ifTilesUnderBoxGoto[2]);
    if (!jumpTarget) return { ok: false, handled: true, log: formatUnknownJumpTargetLog(ifTilesUnderBoxGoto[2], rawLine) };
    const code = emitConditionalJump(ifTilesUnderBoxGoto[1], jumpTarget);
    if (!code.ok) return { ok: false, handled: true, log: code.log };
    return { ok: true, handled: true, lines: code.lines };
  }

  const ifCompareGoto = line.match(/^if\s+(?:(signed|unsigned)\s+)?(.+?)\s*(==|=|!=|<>|<=|>=|<|>)\s*(.+?)\s+(?:then\s+)?goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (ifCompareGoto) {
    const jumpTarget = resolveSourceJumpTarget(ifCompareGoto[5]);
    if (!jumpTarget) return { ok: false, handled: true, log: formatUnknownJumpTargetLog(ifCompareGoto[5], rawLine) };
    const prefix = ifCompareGoto[1] ? `${ifCompareGoto[1]} ` : "";
    const leftToken = normalizeExpression(ifCompareGoto[2]);
    const rightToken = normalizeExpression(ifCompareGoto[4]);
    const operatorToken = ifCompareGoto[3] === "<>" ? "!=" : (ifCompareGoto[3] === "=" ? "==" : ifCompareGoto[3]);
    const code = emitConditionalJump(`${prefix}${leftToken} ${operatorToken} ${rightToken}`, jumpTarget);
    if (!code.ok) return { ok: false, handled: true, log: code.log };
    return { ok: true, handled: true, lines: code.lines };
  }

  const ifButtonGoto = line.match(/^if\s+(not\s+)?button\s+([1-4])\s+on\s+([A-Za-z_][A-Za-z0-9_]*)\s+(?:then\s+)?goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (ifButtonGoto) {
    const jumpTarget = resolveSourceJumpTarget(ifButtonGoto[4]);
    if (!jumpTarget) return { ok: false, handled: true, log: formatUnknownJumpTargetLog(ifButtonGoto[4], rawLine) };
    const code = emitConditionalJump(`${ifButtonGoto[1] || ""}button ${ifButtonGoto[2]} on ${ifButtonGoto[3]}`, jumpTarget);
    if (!code.ok) return { ok: false, handled: true, log: code.log };
    return { ok: true, handled: true, lines: code.lines };
  }

  const ifDirectionGoto = line.match(/^if\s+(not\s+)?(left|right|up|down)\s+on\s+([A-Za-z_][A-Za-z0-9_]*)\s+(?:then\s+)?goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (ifDirectionGoto) {
    const jumpTarget = resolveSourceJumpTarget(ifDirectionGoto[4]);
    if (!jumpTarget) return { ok: false, handled: true, log: formatUnknownJumpTargetLog(ifDirectionGoto[4], rawLine) };
    const code = emitConditionalJump(`${ifDirectionGoto[1] || ""}${ifDirectionGoto[2]} on ${ifDirectionGoto[3]}`, jumpTarget);
    if (!code.ok) return { ok: false, handled: true, log: code.log };
    return { ok: true, handled: true, lines: code.lines };
  }

  const ifBitGoto = line.match(/^if\s+(not\s+)?bit\s+([0-7])\s+of\s+([A-Za-z_][A-Za-z0-9_]*)\s+(?:then\s+)?goto\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (ifBitGoto) {
    const jumpTarget = resolveSourceJumpTarget(ifBitGoto[4]);
    if (!jumpTarget) return { ok: false, handled: true, log: formatUnknownJumpTargetLog(ifBitGoto[4], rawLine) };
    const info = getRuntimeInfo(ifBitGoto[3]);
    if (!info || info.kind === "array" || info.type !== "int8") {
      return { ok: false, handled: true, log: `if bit requires a byte RAM variable: ${rawLine}` };
    }
    const loadVar = emitLoadInt8Into("a", ifBitGoto[3]);
    if (!loadVar) return { ok: false, handled: true, log: `if bit: cannot load variable: ${rawLine}` };
    return {
      ok: true,
      handled: true,
      lines: [...loadVar, `    bit ${ifBitGoto[2]},a`, `    jp ${ifBitGoto[1] ? "z" : "nz"},${jumpTarget}`]
    };
  }

  return { handled: false };
}
