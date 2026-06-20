import { checkRandomStatementDeprecation } from "./deprecations.js";

export function handleRandomBounceStatement({
  line,
  rawLine,
  getRuntimeInfo,
  emitRandomBetweenInto,
  emitRandomFx16Into,
  emitRandomFp5Into,
  scopedRuntimeName,
  makeGeneratedLabel,
  emitLoadInt8Into,
  emitStoreInt8FromA
}) {
  const _depRandom = checkRandomStatementDeprecation(line, rawLine);
  if (_depRandom.handled) return _depRandom;

  const randomByte = line.match(/^random\s+byte\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (randomByte) {
    return {
      ok: false,
      handled: true,
      log: `Legacy 'random byte into' is no longer supported. Use 'Var = random(0, 255)' with an explicit target. Offending line: ${rawLine}`
    };
  }

  const randomBetween = line.match(/^random\s+between\s+(.+?)\s+and\s+(.+?)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (randomBetween) {
    const code = emitRandomBetweenInto(randomBetween[1], randomBetween[2], randomBetween[3]);
    if (!code) return { ok: false, handled: true, log: `random between requires byte bounds and a byte RAM target: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const randomFixed32 = line.match(/^random\s+fixed32\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (randomFixed32) {
    const code = emitRandomFx16Into(randomFixed32[1]);
    if (!code) return { ok: false, handled: true, log: `random fixed32 into requires a fixed32 RAM target: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const randomFp5 = line.match(/^random\s+(?:fp5|float)\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (randomFp5) {
    const code = emitRandomFp5Into(randomFp5[1]);
    if (!code) return { ok: false, handled: true, log: `random fp5 into requires an fp5 RAM target: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const rndAuto = line.match(/^rnd(?:\s+(?:fp5|float))?\s+into\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (rndAuto) {
    const code = emitRandomFp5Into(rndAuto[1]);
    if (!code) return { ok: false, handled: true, log: `rnd into currently requires an fp5 RAM target: ${rawLine}` };
    return { ok: true, handled: true, lines: code };
  }

  const byteLvaluePattern = "([A-Za-z_][A-Za-z0-9_]*(?:\\[[^\\]]+\\])?(?:\\.[A-Za-z_][A-Za-z0-9_]*)*)";
  const reboundByte = line.match(new RegExp(`^rebound\\s+byte\\s+${byteLvaluePattern}\\s+by\\s+${byteLvaluePattern}\\s+between\\s+(.+?)\\s+and\\s+(.+)$`, "i"))
    || line.match(new RegExp(`^bounce\\s+${byteLvaluePattern}\\s+by\\s+${byteLvaluePattern}\\s+between\\s+(.+?)\\s+and\\s+(.+)$`, "i"));
  if (reboundByte) {
    if (/^rebound\s+byte\b/i.test(line)) {
      return {
        ok: false,
        handled: true,
        log: `Legacy 'rebound byte' is no longer supported. Use 'bounce X by DX between Min and Max' with canonical declarations. Offending line: ${rawLine}`
      };
    }
    const valueName = reboundByte[1];
    const deltaName = reboundByte[2];
    const valueBase = valueName.match(/^([A-Za-z_][A-Za-z0-9_]*)\[/)?.[1] || valueName;
    const deltaBase = deltaName.match(/^([A-Za-z_][A-Za-z0-9_]*)\[/)?.[1] || deltaName;
    const valueInfo = getRuntimeInfo(valueBase);
    const deltaInfo = getRuntimeInfo(deltaBase);
    const isByteValue = (info) => info?.type === "int8" || (info?.kind === "array" && info?.elementType === "int8");
    const valueIsRecordField = valueName.includes(".");
    const deltaIsRecordField = deltaName.includes(".");
    if ((!valueIsRecordField && !isByteValue(valueInfo)) || (!deltaIsRecordField && !isByteValue(deltaInfo))) {
      return { ok: false, handled: true, log: `rebound byte requires byte RAM variables for position and delta: ${rawLine}` };
    }
    const checkLowLabel = makeGeneratedLabel("CheckLow");
    const highClampLabel = makeGeneratedLabel("ClampHigh");
    const lowClampLabel = makeGeneratedLabel("ClampLow");
    const storeNextLabel = makeGeneratedLabel("StoreNext");
    const doneLabel = makeGeneratedLabel("Done");
    const highBoundLoad = emitLoadInt8Into("b", reboundByte[4]);
    const lowBoundLoad = emitLoadInt8Into("b", reboundByte[3]);
    if (!highBoundLoad || !lowBoundLoad) {
      return { ok: false, handled: true, log: `rebound byte requires byte bounds: ${rawLine}` };
    }
    const loadDeltaA = emitLoadInt8Into("a", deltaName);
    const loadValueA = emitLoadInt8Into("a", valueName);
    const storeDelta = emitStoreInt8FromA(deltaName);
    const storeValue = emitStoreInt8FromA(valueName);
    if (!loadDeltaA || !loadValueA || !storeDelta || !storeValue) {
      return { ok: false, handled: true, log: `rebound byte requires byte RAM variables for position and delta: ${rawLine}` };
    }
    const useLongJumps = valueIsRecordField || deltaIsRecordField;
    const branch = (condition, label) => `    ${useLongJumps ? "jp" : "jr"} ${condition},${label}`;
    const jump = (label) => `    ${useLongJumps ? "jp" : "jr"} ${label}`;
    return {
      ok: true,
      handled: true,
      lines: [
        ...loadDeltaA,
        "    bit 7,a",
        branch("nz", checkLowLabel),
        ...highBoundLoad,
        ...loadValueA,
        "    ld c,a",
        ...loadDeltaA,
        "    add a,c",
        branch("c", highClampLabel),
        "    cp b",
        branch("z", storeNextLabel),
        branch("c", storeNextLabel),
        `${highClampLabel}:`,
        "    ld a,b",
        ...storeValue,
        ...loadDeltaA,
        "    cpl",
        "    inc a",
        ...storeDelta,
        jump(doneLabel),
        `${storeNextLabel}:`,
        ...storeValue,
        jump(doneLabel),
        `${checkLowLabel}:`,
        ...lowBoundLoad,
        ...loadValueA,
        "    ld c,a",
        ...loadDeltaA,
        "    add a,c",
        "    ld d,a",
        "    cp b",
        branch("c", lowClampLabel),
        "    ld a,c",
        "    cp d",
        branch("c", lowClampLabel),
        "    ld a,d",
        ...storeValue,
        jump(doneLabel),
        `${lowClampLabel}:`,
        "    ld a,b",
        ...storeValue,
        ...loadDeltaA,
        "    cpl",
        "    inc a",
        ...storeDelta,
        `${doneLabel}:`
      ]
    };
  }

  return { handled: false };
}
