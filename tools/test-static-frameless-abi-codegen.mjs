import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repo = path.resolve(import.meta.dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-frameless-"));
const sourcePath = path.join(repo, "studio", "examples-src", "amy-static-frameless-abi-selftest.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
for (const profile of profiles) {
  const asmPath = path.join(temp, `frameless-${profile}.asm`);
  const romPath = path.join(temp, `frameless-${profile}.rom`);
  const result = spawnSync(
    process.execPath,
    [path.join(repo, "tools", "amyc.mjs"), sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile],
    { cwd: repo, encoding: "utf8" }
  );
  assert.equal(result.status, 0, `frameless ${profile} compile failed:\n${result.stdout}\n${result.stderr}`);
  assert(fs.statSync(romPath).size > 0, `${profile} must emit a non-empty ROM`);
  assert.match(
    result.stdout,
    /ABI\s+22 RAM bytes \(15 params \+ 7 locals\) across 7 frameless routine\(s\)/,
    `${profile} must report the static ABI RAM budget`
  );
}

const asmPath = path.join(temp, "frameless-safe.asm");
const asm = fs.readFileSync(asmPath, "utf8");
const block = (name) => {
  const start = asm.indexOf(`AMY_UPROC_${name}:`);
  assert(start >= 0, `missing routine AMY_UPROC_${name}`);
  const tail = asm.slice(start + 1);
  const nextMatch = tail.match(/\n(?:AMY_UPROC_[A-Za-z0-9_]+|Start):/);
  return asm.slice(start, nextMatch ? start + 1 + nextMatch.index : asm.length);
};
const leaf = block("AddU8");
assert.doesNotMatch(leaf, /push ix|\(ix[+-]/i, "eligible leaf must be frameless");
assert.match(leaf, /AMY_SPARM_AddU8_A|AMY_SPARM_AddU8_B/, "eligible leaf must use static parameters");
const recursive = block("RecursiveAcc");
assert.match(recursive, /push ix|\(ix\+4\)/i, "recursive function must retain the IX ABI");
const nmiLeaf = block("AbiNmiAdd");
assert.match(nmiLeaf, /push ix|\(ix\+4\)/i, "NMI-reachable function must retain the IX ABI");
const start = asm.slice(asm.indexOf("Start:"));
const outerStore = start.indexOf("AMY_SPARM_Outer_A");
const nestedValueCall = start.lastIndexOf("call AMY_UPROC_AddU8", outerStore);
const nestedStaging = start.slice(nestedValueCall, outerStore);
assert(nestedValueCall >= 0 && /push hl/i.test(nestedStaging), "nested arguments must finish and stage their value before SPARM stores");
const directCall = start.slice(0, start.indexOf("call AMY_UPROC_AddU8") + 32);
assert.doesNotMatch(directCall, /push hl|pop hl/i, "call-free scalar arguments should use the direct SPARM fast path");
const recursiveCall = recursive.indexOf("call AMY_UPROC_RecursiveAcc");
const recursiveLeafStore = recursive.indexOf("AMY_SPARM_AddU16_A", recursiveCall);
assert(recursiveCall >= 0 && recursiveLeafStore > recursiveCall, "recursive nested result must be staged before static leaf parameters");
const ramSymbols = [...asm.matchAll(/^(AMY_(?:SPARM|LVAR|UVAR)_[A-Za-z0-9_]+) EQU \$([0-9A-F]{4})$/gm)]
  .map((match) => ({ name: match[1], address: match[2] }));
const addresses = new Map();
for (const symbol of ramSymbols) {
  assert(!addresses.has(symbol.address), `${symbol.name} overlaps ${addresses.get(symbol.address)} at $${symbol.address}`);
  addresses.set(symbol.address, symbol.name);
}
const asmEntrySourcePath = path.join(temp, "asm-entry.alexis");
const asmEntryAsmPath = path.join(temp, "asm-entry.asm");
const asmEntryRomPath = path.join(temp, "asm-entry.rom");
fs.writeFileSync(asmEntrySourcePath, `
project "Static ABI ASM Entry Fence"
memory "colecovision_legacy_sdcc"

sub start:
  loop forever
end sub

sub AsmCaller:
  asm {
    ld hl,1
    push hl
    call AMY_UPROC_AsmTarget
    pop de
  }
  return
end sub

sub AsmTarget(u8 Value):
  return
end sub
`);
const asmEntryResult = spawnSync(
  process.execPath,
  [path.join(repo, "tools", "amyc.mjs"), asmEntrySourcePath, "--asm", asmEntryAsmPath, "--rom", asmEntryRomPath, "--opt", "balanced"],
  { cwd: repo, encoding: "utf8" }
);
assert.equal(asmEntryResult.status, 0, `ASM-entry compile failed:\n${asmEntryResult.stdout}\n${asmEntryResult.stderr}`);
const asmEntryAsm = fs.readFileSync(asmEntryAsmPath, "utf8");
const asmTargetStart = asmEntryAsm.indexOf("AMY_UPROC_AsmTarget:");
assert(asmTargetStart >= 0, "missing ASM-target routine");
const asmTargetEnd = asmEntryAsm.indexOf("\nAMY_UPROC_", asmTargetStart + 1);
const asmTargetBlock = asmEntryAsm.slice(asmTargetStart, asmTargetEnd >= 0 ? asmTargetEnd : asmEntryAsm.length);
assert.match(asmTargetBlock, /push ix|\(ix\+4\)/i, "ASM-called parameterized routine must retain the IX stack ABI");

console.log("test-static-frameless-abi-codegen: PASS");
