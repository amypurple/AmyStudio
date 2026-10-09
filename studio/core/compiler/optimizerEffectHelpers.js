import { getRoutineAbi, routineClobbersRegister } from "./routineAbi.js";

function instructionText(line) {
  return String(line || "").replace(/;.*$/, "").trim();
}

export function getDirectCallTarget(line) {
  const match = instructionText(line).match(/^call(?:\s+[a-z]+\s*,)?\s+([A-Za-z_.$?@][\w.$?@]*)$/i);
  return match ? match[1] : null;
}

export function callClobbersRegister(lineOrTarget, register) {
  const text = instructionText(lineOrTarget);
  const target = /^call\b/i.test(text) ? getDirectCallTarget(text) : text;
  if (!target || !getRoutineAbi(target)) return true;
  return routineClobbersRegister(target, register);
}

export function isOptimizerAbsoluteBarrier(line) {
  const text = instructionText(line);
  if (!text) return false;
  if (/^[A-Za-z_.$?@][\w.$?@]*:\s*$/.test(text)) return true;
  if (/^(?:jp|jr|djnz|ret|reti|retn|rst|halt)\b/i.test(text)) return true;
  if (/^(?:exx|ex\s+af\s*,\s*af'|di|ei|im\b|in\b|out\b)/i.test(text)) return true;
  if (/^(?:amy_inline_asm|__asm|\.asm|asm\b)/i.test(text)) return true;
  return false;
}

export function optimizerLineClobbersRegister(line, register) {
  const text = instructionText(line);
  if (!text) return false;
  if (isOptimizerAbsoluteBarrier(text)) return true;
  if (/^call\b/i.test(text)) return callClobbersRegister(text, register);
  return false;
}
