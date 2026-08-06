#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const outputDir = await mkdtemp(join(tmpdir(), "amy-timer-codegen-"));

function exportExample() {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/export-studio-examples-asm.js",
      "--only", "amy-timer-lab",
      "--out-dir", outputDir,
      "--manifest-out", join(outputDir, "manifest.json")
    ], { cwd: repoRoot, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0
      ? resolveRun()
      : rejectRun(new Error(`Timer Lab export failed with exit code ${code}.`)));
  });
}

try {
  await exportExample();
  const asm = await readFile(join(outputDir, "amy-timer-lab.asm"), "utf8");
  assert.match(asm, /AMY_UVAR_BlinkTimer_timer_count EQU \$[0-9A-F]{4}/);
  assert.match(asm, /AMY_UVAR_DoorTimer_timer_active EQU \$[0-9A-F]{4}/);
  assert.match(asm, /Nmi:[\s\S]*AMY_TIMER_DONE_00:[\s\S]*AMY_TIMER_DONE_01:/);
  assert.doesNotMatch(asm, /\b(?:call|jp) (?:InitTimers|StartTimer|StopTimer|TestTimer|RunTimers)\b/);

  assert.match(
    asm,
    /xor a\s*\n\s*ld \(AMY_UVAR_DoorTimer_timer_active\),a\s*\n\s*ld hl,AMY_UVAR_DoorTimer_timer_count[\s\S]*?ld \(AMY_UVAR_DoorTimer_timer_signal\),a\s*\n\s*inc a\s*\n\s*ld \(AMY_UVAR_DoorTimer_timer_active\),a/,
    "start timer must disable first and reactivate only after count/signal are coherent"
  );
  assert.match(
    asm,
    /xor a\s*\n\s*ld \(AMY_UVAR_BlinkTimer_timer_active\),a\s*\n\s*ld hl,AMY_UVAR_BlinkTimer_timer_count\s*\n\s*ld \(hl\),\$1E\s*\n\s*inc hl\s*\n\s*ld \(hl\),\$00\s*\n\s*xor a\s*\n\s*ld \(AMY_UVAR_BlinkTimer_timer_signal\),a/,
    "stop timer must disable before resetting count and clearing the signal"
  );
  console.log("Amy named TIMER codegen PASS (static RAM, NMI update, atomic start/stop ordering)");
} finally {
  await rm(outputDir, { recursive: true, force: true });
}

