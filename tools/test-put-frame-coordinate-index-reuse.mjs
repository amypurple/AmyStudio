#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

function compile(source, asm, rom, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`${profile} compile failed:\n${output}`)));
  });
}

function sourceFor(xIndex) {
  return `project "PUT FRAME COORDINATE INDEX REUSE"
memory "colecovision_legacy_sdcc"
data TestFrame bytes
  1,2,3,4
end data
u8 X[2] = 0
u8 Y[2] = 0
u8 Index = 0
u8 Other = 1
put TestFrame frame size 2,2 at X[${xIndex}],Y[Index]
loop forever
`;
}

const temp = await mkdtemp(join(tmpdir(), "amy-put-frame-index-"));
try {
  for (const profile of profiles) {
    for (const fixture of [
      { id: "same", xIndex: "Index", expectedLoads: 1, transformed: true },
      { id: "different", xIndex: "Other", expectedLoads: 1, transformed: false }
    ]) {
      const source = join(temp, `${fixture.id}-${profile}.alexis`);
      const asmPath = join(temp, `${fixture.id}-${profile}.asm`);
      const rom = join(temp, `${fixture.id}-${profile}.rom`);
      await writeFile(source, sourceFor(fixture.xIndex));
      await compile(source, asmPath, rom, profile);
      const asm = await readFile(asmPath, "utf8");
      const indexLoads = (asm.match(/^\s*ld a,\(AMY_UVAR_Index\)\s*$/gim) || []).length;
      assert.equal(indexLoads, fixture.expectedLoads, `${profile}/${fixture.id}: Index load count`);
      assert.equal(/^\s*ld e,\(hl\)\s*$/im.test(asm), fixture.transformed,
        `${profile}/${fixture.id}: unexpected coordinate-index reuse shape`);
      if (!fixture.transformed) {
        assert.match(asm, /^\s*ld a,\(AMY_UVAR_Other\)\s*$/im,
          `${profile}/${fixture.id}: distinct X index must still be loaded`);
      }
    }
  }
  console.log(`PUT_FRAME coordinate-index reuse PASS (2 cases x ${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_OUTPUT) console.log(`kept test output: ${temp}`);
  else await rm(temp, { recursive: true, force: true });
}
