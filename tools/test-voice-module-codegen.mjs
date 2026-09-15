#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-voice-module-"));

function compile(name, body, succeeds = true) {
  const source = join(temp, `${name}.alexis`);
  const asm = join(temp, `${name}.asm`);
  writeFileSync(source, `project "${name}"\nmemory "colecovision_legacy_sdcc"\n${body}\n`);
  const result = spawnSync(process.execPath, [join(root, "tools", "amyc.mjs"), source, "--asm", asm, "--opt", "balanced"], {
    cwd: root,
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}${result.stderr || ""}${result.error ? `\n${result.error.stack || result.error}` : ""}`;
  if (!succeeds) {
    assert.notEqual(result.status, 0, `${name} should be rejected`);
    return output;
  }
  assert.equal(result.status, 0, `${name} should compile:\n${output}`);
  return readFileSync(asm, "utf8");
}

try {
  const asm = compile("voice-api", `
u8 module = 0
u8 ready = 0
u8 speaking = 0
u8 choice = 1
voice detect into module
voice reset module
voice ready module into ready
voice allophone $2D using module
voice speak phrase using module
voice start phrase using module
voice start phrases[choice] using module
voice speaking into speaking
voice stop
data phrase bytes
  $2D,$14,$FF
end data
data phrase2 bytes
  $07,$FF
end data
data phrases words
  @phrase,@phrase2
end data
`);
  assert.match(asm, /call AMY_VOICE_DETECT/i);
  assert.match(asm, /call AMY_VOICE_RESET/i);
  assert.match(asm, /call AMY_VOICE_READY/i);
  assert.match(asm, /call AMY_VOICE_ALLOPHONE/i);
  assert.match(asm, /ld hl,AMY_UDATA_phrase[\s\S]*call AMY_VOICE_SPEAK/i);
  assert.match(asm, /call AMY_VOICE_START/i);
  assert.match(asm, /call AMY_VOICE_SPEAKING/i);
  assert.match(asm, /call AMY_VOICE_STOP/i);
  assert.match(asm, /AMY_VOICE_MODULE EQU \$[0-9A-F]{4}/i);
  assert.match(asm, /AMY_VOICE_POINTER EQU \$[0-9A-F]{4}/i);
  assert.match(asm, /call AMY_VOICE_UPDATE/i);
  assert.match(asm, /ld hl,AMY_UDATA_phrases[\s\S]*add hl,de[\s\S]*call AMY_VOICE_START/i);
  assert.match(asm, /out \(\$43\),a/i);
  assert.match(asm, /out \(\$48\),a/i);

  assert.match(compile("bad-detect", "u16 module = 0\nvoice detect into module", false), /byte variable/i);
  assert.match(compile("bad-phrase", "u8 module = 0\nvoice speak 42 using module", false), /data block or word-table entry/i);
  console.log("voice module codegen: PASS");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
