#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const directory = await mkdtemp(join(tmpdir(), "amy-copy-count-"));
const sourcePath = join(directory, "constcount.alexis");
const source = `const BYTE_MAX = 255
const WORD_MIN = BYTE_MAX + 1
const N = 300
const VIEW_N1 = 1024
tile screen
copy Tbl count BYTE_MAX to vram.pattern
copy Tbl count WORD_MIN to vram.pattern
copy Tbl count N to vram.pattern
copy Tbl count VIEW_N1 to vram.pattern
copy Tbl count 300 to vram.pattern
data Tbl bytes = 1, 2, 3
screen on
`;
const forwardSource = `tile screen
copy Tbl count N to vram.pattern
copy Tbl count VIEW_N1 to vram.color
copy Tbl count BYTE_MAX to vram.name
const N = 360
const VIEW_N1 = N + 664
const BYTE_MAX = 255
data Tbl bytes = 1, 2, 3
screen on
`;

try {
  await writeFile(sourcePath, source);
  for (const profile of ["off", "balanced", "aggressive", "experimental"]) {
    const asmPath = join(directory, `constcount-${profile}.asm`);
    const romPath = join(directory, `constcount-${profile}.rom`);
    await run(["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile]);
    const asm = await readFile(asmPath, "utf8");

    assert.match(asm, /ld bc,AMY_UCONST_BYTE_MAX\s+call WRITE_VRAM/i, `${profile}: 255 should use WRITE_VRAM`);
    assert.match(asm, /ld bc,AMY_UCONST_WORD_MIN\s+call AMY_COPY_BYTES_TO_VRAM/i, `${profile}: 256 expression should use the wide wrapper`);
    assert.match(asm, /ld bc,AMY_UCONST_N\s+call AMY_COPY_BYTES_TO_VRAM/i, `${profile}: 300 should preserve both bytes`);
    assert.match(asm, /ld bc,AMY_UCONST_VIEW_N1\s+call AMY_COPY_BYTES_TO_VRAM/i, `${profile}: 1024 should preserve both bytes`);
    assert.match(asm, /ld bc,300\s+call AMY_COPY_BYTES_TO_VRAM/i, `${profile}: literal and named counts should use the same path`);
    assert.doesNotMatch(asm, /ld a,AMY_UCONST_(?:WORD_MIN|N|VIEW_N1)/i, `${profile}: wide constants must not be truncated through A`);

    const forwardPath = join(directory, `forward-${profile}.alexis`);
    const forwardAsmPath = join(directory, `forward-${profile}.asm`);
    const forwardRomPath = join(directory, `forward-${profile}.rom`);
    await writeFile(forwardPath, forwardSource);
    await run(["tools/amyc.mjs", forwardPath, "--asm", forwardAsmPath, "--rom", forwardRomPath, "--opt", profile]);
    const forwardAsm = await readFile(forwardAsmPath, "utf8");
    assert.match(forwardAsm, /ld bc,AMY_UCONST_N\s+call AMY_COPY_BYTES_TO_VRAM/i, `${profile}: forward 360 count should use the wide wrapper`);
    assert.match(forwardAsm, /ld bc,AMY_UCONST_VIEW_N1\s+call AMY_COPY_BYTES_TO_VRAM/i, `${profile}: forward constant expression should preserve 1024`);
    assert.match(forwardAsm, /ld bc,AMY_UCONST_BYTE_MAX\s+call WRITE_VRAM/i, `${profile}: forward 255 count should keep the byte-sized path`);
    assert.doesNotMatch(forwardAsm, /ld a,AMY_UCONST_(?:N|VIEW_N1)/i, `${profile}: forward wide constants must not be truncated through A`);
  }
  console.log("Named constant copy counts: PASS");
} finally {
  await rm(directory, { recursive: true, force: true });
}

function run(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; });
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("error", rejectRun);
    child.on("close", code => code === 0 ? resolveRun(output) : rejectRun(new Error(output)));
  });
}
