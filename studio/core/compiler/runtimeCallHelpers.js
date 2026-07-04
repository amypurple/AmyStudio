import { ROUTINE_CLOBBERS } from "./routineAbi.js";

export const RUNTIME_CLOBBERS = ROUTINE_CLOBBERS;

export function emitSafeCall(funcName, liveRegs, runtimeClobbers = RUNTIME_CLOBBERS) {
  const normalizedName = String(funcName || "").trim().toUpperCase();
  const clobbers = runtimeClobbers[funcName] || runtimeClobbers[normalizedName] || [];
  const toSave = liveRegs.filter((r) => clobbers.includes(r));
  const pushes = toSave.map((r) => `    push ${r}`);
  const pops = [...toSave].reverse().map((r) => `    pop ${r}`);
  return [...pushes, `    call ${funcName}`, ...pops];
}
