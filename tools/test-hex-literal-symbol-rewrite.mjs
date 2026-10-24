#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const directory = await mkdtemp(join(tmpdir(), "amy-hex-symbol-"));
const sourcePath = join(directory, "hex.alexis");
const asmPath = join(directory, "hex.asm");
const romPath = join(directory, "hex.rom");
const source = `u8 A = 1
u8 BE = 2
u8 BEEF = 3
u8 CAFE = 4
data HexValues bytes
  $A,$BE,$BEEF,$CAFE,A,BE,BEEF,CAFE
end data
screen on
`;

try {
  await writeFile(sourcePath, source);
  const output = await run(["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", "balanced"]);
  assert.match(output, /ROM\s+/);
  const asm = await readFile(asmPath, "utf8");
  assert.match(asm, /db \$A,\$BE,\$BEEF,\$CAFE,AMY_UVAR_A,AMY_UVAR_BE,AMY_UVAR_BEEF,AMY_UVAR_CAFE/i);
  assert.doesNotMatch(asm, /\$AMY_UVAR_/i);
  console.log("Hex literal/user-symbol rewrite: PASS");
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
