export function handleDataCursorStatement({
  line,
  rawLine,
  ensureDataCursorVar,
  resolveAddressSymbol,
  splitTopLevelArgs,
  resolveValueType,
  parseArrayRef,
  emitLoadArrayAddressIntoHL,
  emitStoreInt8FromA,
  emitStoreInt16FromHL
}) {
  const restoreData = line.match(/^restore\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (restoreData) {
    const cursor = ensureDataCursorVar();
    return {
      ok: true,
      handled: true,
      sawExplicitRestore: true,
      lines: [
        `    ld hl,${resolveAddressSymbol(restoreData[1])}`,
        `    ld (${cursor}),hl`
      ]
    };
  }

  const readData = line.match(/^read\s+(.+)$/i);
  if (!readData) return { handled: false };

  const cursor = ensureDataCursorVar();
  const targets = splitTopLevelArgs(readData[1]).map((part) => part.trim()).filter(Boolean);
  if (!targets.length) {
    return { ok: false, handled: true, log: `read requires at least one runtime target: ${rawLine}` };
  }

  const out = [`    ld hl,(${cursor})`];
  for (const target of targets) {
    const targetType = resolveValueType(target);
    const targetArrayRef = parseArrayRef(target);
    if (!targetType) {
      return { ok: false, handled: true, log: `read target must be a runtime variable or array element: ${rawLine}` };
    }
    if (targetType === "int8") {
      if (targetArrayRef) {
        const loadAddress = emitLoadArrayAddressIntoHL(targetArrayRef.name, targetArrayRef.index);
        if (!loadAddress) {
          return { ok: false, handled: true, log: `Invalid array target for read: ${rawLine}` };
        }
        out.push("    ld c,(hl)");
        out.push("    inc hl");
        out.push("    push hl");
        out.push(...loadAddress);
        out.push("    ld a,c");
        out.push("    ld (hl),a");
        out.push("    pop hl");
      } else {
        out.push("    ld c,(hl)");
        out.push("    inc hl");
        out.push("    push hl");
        out.push("    ld a,c");
        out.push(...emitStoreInt8FromA(target));
        out.push("    pop hl");
      }
    } else {
      out.push("    ld e,(hl)");
      out.push("    inc hl");
      out.push("    ld d,(hl)");
      out.push("    inc hl");
      out.push("    push hl");
      out.push("    ld h,d");
      out.push("    ld l,e");
      out.push(...emitStoreInt16FromHL(target));
      out.push("    pop hl");
    }
  }
  out.push(`    ld (${cursor}),hl`);
  return { ok: true, handled: true, lines: out };
}
