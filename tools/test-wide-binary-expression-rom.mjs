#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = await mkdtemp(join(tmpdir(), "amy-wide-binary-"));

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
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`compile failed: ${profile}\n${output}`)));
  });
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${name}`);
  return Number.parseInt(match[1], 16);
}

function readU32(core, address) {
  const bytes = core.readRam(address, 4);
  return (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
}

async function assertCompileFails(name, body) {
  const source = join(temp, `${name}.alexis`);
  await writeFile(source, `project "WIDE BINARY REJECTION"\n${body}\nloop forever\n`);
  await assert.rejects(
    compile(source, join(temp, `${name}.asm`), join(temp, `${name}.rom`), "balanced"),
    /compile failed/
  );
}

try {
  const source = join(temp, "wide-binary.alexis");
  await writeFile(source, `project "WIDE BINARY EXPRESSION ROM"
memory "colecovision_legacy_sdcc"
record WideState:
  u32 Left
  u32 Right
  u32 Result
end record
u8 GuardBefore = 77
u32 CarryLeft = 65535
u32 CarryRight = 2
u32 CarryResult = 0
u32 BorrowLeft = 1
u32 BorrowRight = 2
u32 BorrowResult = 0
i32 Negative = -100
i32 Positive = 40
i32 SignedSum = 0
i32 SignedDifference = 0
u32 Alias = 10
u32 AliasAdd = 20
u32 ProductLeft = 70000
u32 ProductRight = 70000
u32 Product = 0
i32 SignedProductLeft = -12345
i32 SignedProductRight = 321
i32 SignedProduct = 0
u32 Values[2]
u32 ArrayResult = 0
WideState State
u8 GuardAfter = 88
CarryResult = CarryLeft + CarryRight
BorrowResult = BorrowLeft - BorrowRight
SignedSum = Negative + Positive
SignedDifference = Negative - Positive
Alias = Alias + AliasAdd
Alias = Alias - 1
Product = ProductLeft * ProductRight
SignedProduct = SignedProductLeft * SignedProductRight
Values[0] = 100000
Values[1] = 234567
ArrayResult = Values[0] + Values[1]
State.Left = 300000
State.Right = 456789
State.Result = State.Left + State.Right
loop forever
`);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `wide-${profile}.asm`);
    const romPath = join(temp, `wide-${profile}.rom`);
    await compile(source, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    const core = await GearcolecoTestCore.create({ seed: 0x57333245 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "GuardBefore"), 1)[0], 77, `${profile}: guard before`);
      assert.equal(core.readRam(addressOf(asm, "GuardAfter"), 1)[0], 88, `${profile}: guard after`);
      assert.equal(readU32(core, addressOf(asm, "CarryResult")), 65537, `${profile}: carry`);
      assert.equal(readU32(core, addressOf(asm, "BorrowResult")), 0xFFFFFFFF, `${profile}: wrap borrow`);
      assert.equal(readU32(core, addressOf(asm, "SignedSum")), (-60) >>> 0, `${profile}: signed sum`);
      assert.equal(readU32(core, addressOf(asm, "SignedDifference")), (-140) >>> 0, `${profile}: signed difference`);
      assert.equal(readU32(core, addressOf(asm, "Alias")), 29, `${profile}: aliased destination`);
      assert.equal(readU32(core, addressOf(asm, "Product")), 605032704, `${profile}: wrapped product`);
      assert.equal(readU32(core, addressOf(asm, "SignedProduct")), (-3962745) >>> 0, `${profile}: signed product`);
      assert.equal(readU32(core, addressOf(asm, "ArrayResult")), 334567, `${profile}: array operands`);
      assert.equal(readU32(core, addressOf(asm, "State") + 8), 756789, `${profile}: record operands`);
    } finally {
      core.destroy();
    }
  }
  await assertCompileFails("mixed-signedness", "u32 Left = 1\ni32 Right = -1\nu32 Result = 0\nResult = Left + Right");
  await assertCompileFails("binary-division", "u32 Left = 8\nu32 Right = 2\nu32 Result = 0\nResult = Left / Right");
  console.log(`wide binary expression ROM: PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}

