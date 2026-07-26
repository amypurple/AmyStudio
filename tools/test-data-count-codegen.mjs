#!/usr/bin/env node
// Regression for Amy data byte repeat syntax used by starter graphics editors.
// `data Name bytes` followed by `$20 count 768` must emit 768 ROM bytes, not an empty block.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function compileAsm(source) {
  const dir = mkdtempSync(path.join(tmpdir(), "amy-data-count-"));
  try {
    const src = path.join(dir, "data-count.alexis");
    const asm = path.join(dir, "data-count.asm");
    writeFileSync(src, source, "utf8");
    const result = spawnSync(process.execPath, [path.join(REPO, "tools", "amyc.mjs"), src, "--asm", asm, "--opt", "safe"], {
      cwd: REPO,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `compile failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    return readFileSync(asm, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const multiline = compileAsm(`
  text screen
  loop forever

data UntitledNameTable bytes
  $20 count 768
end data
`);

assert.match(multiline, /AMY_UDATA_UntitledNameTable:/);
const block = multiline.split("AMY_UDATA_UntitledNameTable:")[1].split(/\n[A-Za-z_][A-Za-z0-9_]*:/)[0];
const emittedBytes = [...block.matchAll(/\$20/g)].length;
assert.equal(emittedBytes, 768, `expected 768 repeated bytes, got ${emittedBytes}`);

const inline = compileAsm(`
  text screen
  loop forever

data InlineNameTable bytes $20 count 768
end data
`);
assert.match(inline, /AMY_UDATA_InlineNameTable:/);
assert.equal([...inline.split("AMY_UDATA_InlineNameTable:")[1].matchAll(/\$20/g)].length >= 768, true);

console.log("PASS data count codegen");