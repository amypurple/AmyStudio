#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function compile(sourcePath, asmPath, romPath) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", "balanced"], {
      cwd: root,
      stdio: "ignore"
    });
    child.on("error", rejectRun);
    child.on("exit", resolveRun);
  });
}

const output = await mkdtemp(join(tmpdir(), "amy-constant-contexts-"));
try {
  const variants = [
    ["literal", "4", "10", "1", "3"],
    ["constant", "ItemCount", "SleepSeconds", "ShiftCount", "SoundStep"]
  ];
  const roms = [];
  for (const [name, count, timeout, shiftCount, soundStep] of variants) {
    const constants = name === "constant"
      ? "const ItemCount = 4\nconst SleepSeconds = 10\nconst ShiftCount = 1\nconst SoundStep = 3\n"
      : "";
    const source = `project "CONSTANT CONTEXTS"
${constants}record Bucket:
  u8 Items[${count}]
end record
Bucket Value
u8 Values[${count}]
u8 Index = 0
u8 Sum = 0
sub start:
  Value.Items[3] = 7
  Values[0] = 1
  Values[1] = 2
  Values[2] = 3
  Values[3] = Value.Items[3]
  for each Item, Index in Values
    Sum += Item
  next Item
  shift array Values down ${shiftCount}
  play dsound TestVoice step ${soundStep}
  sleep after ${timeout} seconds
  loop forever
end sub
data TestVoice bytes = $00,$00
`;
    const sourcePath = join(output, `${name}.alexis`);
    const asmPath = join(output, `${name}.asm`);
    const romPath = join(output, `${name}.rom`);
    await writeFile(sourcePath, source);
    assert.equal(await compile(sourcePath, asmPath, romPath), 0, `${name}: compilation failed`);
    const asm = await readFile(asmPath, "utf8");
    assert.match(asm, /ld hl,600\s+ld de,500\s+ld a,0\s+call AMY_SLEEP_SERVICE/i,
      `${name}: sleep timeout was not folded at compile time`);
    roms.push(await readFile(romPath));
  }
  assert.deepEqual(roms[1], roms[0], "named constants must produce the same ROM bytes as literals");

  const invalid = `project "BAD CONSTANT CONTEXT"
record Bucket:
  u8 Items[MissingCount]
end record
loop forever
`;
  const invalidPath = join(output, "invalid.alexis");
  await writeFile(invalidPath, invalid);
  assert.notEqual(await compile(invalidPath, join(output, "invalid.asm"), join(output, "invalid.rom")), 0,
    "an unknown record dimension constant must fail closed");

  const invalidStep = `project "BAD DSOUND STEP"
const SoundStep = 256
sub start:
  play dsound TestVoice step SoundStep
  loop forever
end sub
data TestVoice bytes = $00,$00
`;
  const invalidStepPath = join(output, "invalid-step.alexis");
  await writeFile(invalidStepPath, invalidStep);
  assert.notEqual(await compile(invalidStepPath, join(output, "invalid-step.asm"), join(output, "invalid-step.rom")), 0,
    "an out-of-range dsound step must fail closed");
} finally {
  await rm(output, { recursive: true, force: true });
}

console.log("Compile-time constant contexts: PASS");
