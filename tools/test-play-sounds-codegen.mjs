#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-play-sounds-"));

function compile(name, statement, expectSuccess = true) {
  const source = join(temp, `${name}.alexis`);
  const asm = join(temp, `${name}.asm`);
  writeFileSync(source, `project "${name}"\nmemory "colecovision_legacy_sdcc"\n${statement}\n`);
  const result = spawnSync(process.execPath, [join(root, "tools", "amyc.mjs"), source, "--asm", asm, "--opt", "balanced"], {
    cwd: root,
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (!expectSuccess) {
    assert.notEqual(result.status, 0, `${name} should be rejected`);
    return output;
  }
  assert.equal(result.status, 0, `${name} should compile:\n${output}`);
  return readFileSync(asm, "utf8");
}

try {
  const asm = compile("play-sounds-list", "play sounds 5, 6, 7");
  assert.equal((asm.match(/call AMY_PLAY_SOUND/gi) || []).length, 3);
  assert.match(asm, /ld b,5[\s\S]*call AMY_PLAY_SOUND[\s\S]*ld b,6[\s\S]*call AMY_PLAY_SOUND[\s\S]*ld b,7/i);

  const expressionAsm = compile("play-sounds-expressions", "play sounds 1 + 1, random(3, 4)");
  assert.equal((expressionAsm.match(/call AMY_PLAY_SOUND/gi) || []).length, 2);

  assert.match(compile("play-sound-list-rejected", "play sound 5, 6, 7", false), /use play sounds/i);
  assert.match(compile("play-sounds-single-rejected", "play sounds 5", false), /at least two/i);
  console.log("play sounds codegen: PASS");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
