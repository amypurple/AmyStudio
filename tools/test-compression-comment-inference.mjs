#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-codec-comment-"));

function build(body, stem) {
  const source = join(temp, `${stem}.alexis`);
  const asm = join(temp, `${stem}.asm`);
  writeFileSync(source, `project "Codec comment ${stem}"
asm {
${body}
}
Forever:
goto Forever
`);
  const result = spawnSync(process.execPath, ["tools/amyc.mjs", source, "--asm", asm], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
  return readFileSync(asm, "utf8");
}

try {
  assert.doesNotMatch(build("  ; ZX0 uses zx0_decompress", "comment"), /include\s+"src\/compression\/zx0_vram\.asm"/i);
  assert.doesNotMatch(build('MsgData: db "ZX0 zx0_decompress",0', "string"), /include\s+"src\/compression\/zx0_vram\.asm"/i);
  assert.doesNotMatch(build("  ld a,';' ; zx0_decompress", "character-semicolon"), /include\s+"src\/compression\/zx0_vram\.asm"/i);
  assert.doesNotMatch(build("  ex af,af' ; zx0_decompress", "alternate-register"), /include\s+"src\/compression\/zx0_vram\.asm"/i);
  assert.match(build("  call zx0_decompress", "call"), /include\s+"src\/compression\/zx0_vram\.asm"/i);
  console.log("Compression comment inference: PASS");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
