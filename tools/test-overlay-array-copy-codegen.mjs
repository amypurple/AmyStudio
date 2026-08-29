#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-overlay-copy-"));
const source = join(temp, "overlay-copy.alexis");
const asmPath = join(temp, "overlay-copy.asm");

writeFileSync(source, `project "OVERLAY ARRAY COPY"
memory "colecovision_legacy_sdcc"

record SceneMemory:
  u8 Lookup[8]
end record

overlay SceneRam
  Game as SceneMemory
  Menu as SceneMemory
end overlay

sub ExerciseCopies:
  u8 LocalLookup[8] = 0
  copy SceneRam.Game.Lookup to LocalLookup count 8
  copy LocalLookup to SceneRam.Game.Lookup count 8
  return
end sub

ExerciseCopies
loop forever
`);

try {
  const result = spawnSync(process.execPath, [join(root, "tools", "amyc.mjs"), source, "--asm", asmPath, "--opt", "balanced"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  assert.equal(result.status, 0, `${result.error || ""}\n${result.stdout || ""}${result.stderr || ""}`);
  const asm = readFileSync(asmPath, "utf8");
  const routine = asm.match(/AMY_UPROC_ExerciseCopies:[\s\S]*?\n\s*ret\b/i)?.[0] || "";
  assert.ok(routine, "ExerciseCopies must be present in generated ASM.");
  assert.equal((routine.match(/\bldir\b/gi) || []).length, 2, "Both overlay/local copy directions must emit LDIR.");
  console.log("overlay array copy codegen self-test: PASS");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
