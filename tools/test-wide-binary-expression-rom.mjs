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
u32 Dividend = 4000000000
u32 Divisor = 3
u32 Quotient = 0
u32 ZeroDivisor = 0
u32 ZeroQuotient = 99
u32 Remainder = 99
u32 ZeroRemainder = 99
u32 CompoundRemainder = 4000000000
i32 SignedProductLeft = -12345
i32 SignedProductRight = 321
i32 SignedProduct = 0
i32 SignedCompound = -2000
i32 SignedCompoundFactor = 17
i32 SignedDividendA = -100
i32 SignedDividendB = 100
i32 SignedDivisorPositive = 7
i32 SignedDivisorNegative = -7
i32 SignedZeroDivisor = 0
i32 SignedQuotientNN = 0
i32 SignedQuotientNP = 0
i32 SignedQuotientPN = 0
i32 SignedZeroQuotient = 99
i32 SignedCompoundQuotient = -100
i32 SignedRemainderNP = 99
i32 SignedRemainderPN = 99
i32 SignedRemainderNN = 99
i32 SignedZeroRemainder = 99
i32 SignedCompoundRemainder = -100
i32 SignedMin = -2147483648
i32 SignedMinusOne = -1
i32 SignedOverflowQuotient = 0
u32 Values[2]
i32 SignedValues[2]
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
Quotient = Dividend / Divisor
ZeroQuotient = Dividend / ZeroDivisor
Remainder = Dividend % Divisor
ZeroRemainder = Dividend % ZeroDivisor
CompoundRemainder %= Divisor
SignedProduct = SignedProductLeft * SignedProductRight
SignedCompound *= SignedCompoundFactor
SignedQuotientNN = SignedDividendA / SignedDivisorNegative
SignedQuotientNP = SignedDividendA / SignedDivisorPositive
SignedQuotientPN = SignedDividendB / SignedDivisorNegative
SignedZeroQuotient = SignedDividendA / SignedZeroDivisor
SignedCompoundQuotient /= SignedDivisorPositive
SignedRemainderNP = SignedDividendA % SignedDivisorPositive
SignedRemainderPN = SignedDividendB % SignedDivisorNegative
SignedRemainderNN = SignedDividendA % SignedDivisorNegative
SignedZeroRemainder = SignedDividendA % SignedZeroDivisor
SignedCompoundRemainder %= SignedDivisorPositive
SignedOverflowQuotient = SignedMin / SignedMinusOne
Values[0] = 100000
Values[1] = 234567
SignedValues[0] = -25
SignedValues[1] = 24
SignedValues[0] *= SignedValues[1]
SignedValues[1] = -25
SignedValues[1] /= 4
Values[1] %= 10
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
      for (let frame = 0; frame < 60; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "GuardBefore"), 1)[0], 77, `${profile}: guard before`);
      assert.equal(core.readRam(addressOf(asm, "GuardAfter"), 1)[0], 88, `${profile}: guard after`);
      assert.equal(readU32(core, addressOf(asm, "CarryResult")), 65537, `${profile}: carry`);
      assert.equal(readU32(core, addressOf(asm, "BorrowResult")), 0xFFFFFFFF, `${profile}: wrap borrow`);
      assert.equal(readU32(core, addressOf(asm, "SignedSum")), (-60) >>> 0, `${profile}: signed sum`);
      assert.equal(readU32(core, addressOf(asm, "SignedDifference")), (-140) >>> 0, `${profile}: signed difference`);
      assert.equal(readU32(core, addressOf(asm, "Alias")), 29, `${profile}: aliased destination`);
      assert.equal(readU32(core, addressOf(asm, "Product")), 605032704, `${profile}: wrapped product`);
      assert.equal(readU32(core, addressOf(asm, "Quotient")), 1333333333, `${profile}: unsigned quotient`);
      assert.equal(readU32(core, addressOf(asm, "ZeroQuotient")), 0, `${profile}: zero divisor`);
      assert.equal(readU32(core, addressOf(asm, "Remainder")), 1, `${profile}: unsigned remainder`);
      assert.equal(readU32(core, addressOf(asm, "ZeroRemainder")), 0, `${profile}: unsigned zero-divisor remainder`);
      assert.equal(readU32(core, addressOf(asm, "CompoundRemainder")), 1, `${profile}: unsigned compound remainder`);
      assert.equal(readU32(core, addressOf(asm, "SignedProduct")), (-3962745) >>> 0, `${profile}: signed product`);
      assert.equal(readU32(core, addressOf(asm, "SignedCompound")), (-34000) >>> 0, `${profile}: signed compound product`);
      assert.equal(readU32(core, addressOf(asm, "SignedQuotientNN")), 14, `${profile}: negative divided by negative`);
      assert.equal(readU32(core, addressOf(asm, "SignedQuotientNP")), (-14) >>> 0, `${profile}: negative divided by positive`);
      assert.equal(readU32(core, addressOf(asm, "SignedQuotientPN")), (-14) >>> 0, `${profile}: positive divided by negative`);
      assert.equal(readU32(core, addressOf(asm, "SignedZeroQuotient")), 0, `${profile}: signed zero divisor`);
      assert.equal(readU32(core, addressOf(asm, "SignedCompoundQuotient")), (-14) >>> 0, `${profile}: signed compound quotient`);
      assert.equal(readU32(core, addressOf(asm, "SignedRemainderNP")), (-2) >>> 0, `${profile}: negative signed remainder`);
      assert.equal(readU32(core, addressOf(asm, "SignedRemainderPN")), 2, `${profile}: positive signed remainder with negative divisor`);
      assert.equal(readU32(core, addressOf(asm, "SignedRemainderNN")), (-2) >>> 0, `${profile}: negative signed remainder with negative divisor`);
      assert.equal(readU32(core, addressOf(asm, "SignedZeroRemainder")), 0, `${profile}: signed zero-divisor remainder`);
      assert.equal(readU32(core, addressOf(asm, "SignedCompoundRemainder")), (-2) >>> 0, `${profile}: signed compound remainder`);
      assert.equal(readU32(core, addressOf(asm, "SignedOverflowQuotient")), 0x80000000, `${profile}: signed overflow wraps`);
      assert.equal(readU32(core, addressOf(asm, "SignedValues")), (-600) >>> 0, `${profile}: signed array compound product`);
      assert.equal(readU32(core, addressOf(asm, "SignedValues") + 4), (-6) >>> 0, `${profile}: signed array compound quotient`);
      assert.equal(readU32(core, addressOf(asm, "Values") + 4), 7, `${profile}: unsigned array compound remainder`);
      assert.equal(readU32(core, addressOf(asm, "ArrayResult")), 100007, `${profile}: array operands`);
      assert.equal(readU32(core, addressOf(asm, "State") + 8), 756789, `${profile}: record operands`);
    } finally {
      core.destroy();
    }
  }
  await assertCompileFails("mixed-signedness", "u32 Left = 1\ni32 Right = -1\nu32 Result = 0\nResult = Left + Right");
  console.log(`wide binary expression ROM: PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
