#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const observed = [
  "AdjacentResult", "InvariantResult", "DirectMutationResult",
  "RefMutationResult", "CallMutationResult", "BranchResult",
  "WrapResult", "GuardLow", "GuardHigh"
];

// This fixture intentionally combines optimization opportunities with barriers.
// Future semantic passes may change its ASM and ROM size, never these results.
const sourceText = `project "SEMANTIC OPTIMIZATION EQUIVALENCE"
memory "colecovision_legacy_sdcc"

u8 Left[8] = 0
u8 Right[8] = 0
u8 Index = 0
u8 Invariant = 3
u8 Mutable = 1
u8 AdjacentResult = 0
u8 InvariantResult = 0
u8 DirectMutationResult = 0
u8 RefMutationResult = 0
u8 CallMutationResult = 0
u8 BranchResult = 0
u8 WrapResult = 0
u8 GuardLow = $A5
u8 GuardHigh = $5A

sub Bump(ref u8 Value):
  Value += 1
end sub

sub ChangeMutable:
  Mutable += 2
end sub

Left[0] = 2
Left[1] = 4
Left[2] = 6
Left[3] = 8
Left[4] = 10
Left[5] = 12
Left[6] = 14
Left[7] = 16
Right[0] = 1
Right[1] = 3
Right[2] = 5
Right[3] = 7
Right[4] = 9
Right[5] = 11
Right[6] = 13
Right[7] = 15

' Positive candidate: adjacent accesses share the same widened index.
Index = 5
AdjacentResult = Left[Index] + Right[Index]

' Positive candidate: Invariant is unchanged throughout the loop.
for Index = 0 to 3
  InvariantResult += Left[Index] + Invariant
next

' Negative: the apparently reusable value changes directly in the loop.
for Index = 0 to 2
  DirectMutationResult += Mutable
  Mutable += 1
next

' Negative: a ref call changes the value between uses.
Mutable = 4
RefMutationResult = Mutable
Bump(Mutable)
RefMutationResult += Mutable

' Negative: an ordinary call changes global memory.
Mutable = 5
CallMutationResult = Mutable
ChangeMutable
CallMutationResult += Mutable

' Similar branches have one different input and a common computation.
if AdjacentResult = 23 then
  BranchResult = Left[2] + Invariant
else
  BranchResult = Right[2] + Invariant
end if

' Byte overflow semantics must survive strength reduction and value reuse.
WrapResult = 255
WrapResult += 1

loop forever
`;

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

function symbolAddress(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "m"));
  assert.ok(match, `missing RAM symbol ${name}`);
  return Number.parseInt(match[1], 16);
}

async function inspect(rom, asm, bios) {
  const core = await GearcolecoTestCore.create({ seed: 0x53454D41 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 5; frame += 1) core.runFrame();
    return Object.fromEntries(observed.map((name) => [name, core.readRam(symbolAddress(asm, name), 1)[0]]));
  } finally {
    core.destroy();
  }
}

const expected = {
  AdjacentResult: 23,
  InvariantResult: 32,
  DirectMutationResult: 6,
  RefMutationResult: 9,
  CallMutationResult: 12,
  BranchResult: 9,
  WrapResult: 0,
  GuardLow: 0xA5,
  GuardHigh: 0x5A
};

const temp = await mkdtemp(join(tmpdir(), "amy-semantic-equivalence-"));
try {
  const source = join(temp, "semantic.alexis");
  const bios = await readFile(join(root, "studio", "bios", "colecovision.rom"));
  await writeFile(source, sourceText);
  let baseline = null;
  const sizes = [];

  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const romPath = join(temp, `${profile}.rom`);
    await compile(source, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const adjacentBlock = asm.match(/ld a,5\s+ld \(AMY_UVAR_Index\),a([\s\S]*?)ld \(AMY_UVAR_AdjacentResult\),a/i)?.[1] || "";
    assert.equal(
      (adjacentBlock.match(/ld a,\(AMY_UVAR_Index\)/gi) || []).length,
      1,
      `${profile}: adjacent array reads should widen their shared index exactly once`
    );
    const state = await inspect(rom, asm, bios);
    assert.deepEqual(state, expected, `${profile}: unexpected runtime result`);
    if (baseline === null) baseline = state;
    else assert.deepEqual(state, baseline, `${profile}: differs from optimizer-off runtime state`);
    sizes.push(`${profile}=${rom.length}`);
  }

  console.log(`semantic optimization equivalence PASS (5 profiles; ${sizes.join(", ")})`);
} finally {
  if (process.env.AMY_KEEP_TEST_OUTPUT) console.log(`kept test output: ${temp}`);
  else await rm(temp, { recursive: true, force: true });
}
