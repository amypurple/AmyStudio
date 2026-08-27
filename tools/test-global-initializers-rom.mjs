#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = process.argv.slice(2).length ? process.argv.slice(2) : ["off", "safe", "balanced", "aggressive", "experimental"];
const cases = [
  {
    name: "single",
    source: `u8 X = 42\nu8 Result = 0\nResult = X\nloop forever\n`,
    expected: { X: 42, Result: 42 }
  },
  {
    name: "array-before-scalars",
    source: `u8 Board[64] = 0\nu8 CursorX = 3\nu8 CursorY = 5\nu8 ResultX = 0\nu8 ResultY = 0\nResultX = CursorX\nResultY = CursorY\nloop forever\n`,
    expected: { Board: 0, CursorX: 3, CursorY: 5, ResultX: 3, ResultY: 5 }
  },
  {
    name: "separated-values",
    source: `u8 Victim = 17\nu8 Pad[13] = 0\nu8 Aa = 42\nu8 Bb = 99\nu8 ResultA = 0\nu8 ResultB = 0\nResultA = Aa\nResultB = Bb\nloop forever\n`,
    expected: { Victim: 17, Pad: 0, Aa: 42, Bb: 99, ResultA: 42, ResultB: 99 }
  },
  {
    name: "wide-binary-expression-aliases",
    source: `u32 A = 100000\nu32 B = 50000\nu32 Sum = 0\nu32 Difference = 0\nu32 LiteralSum = 0\ni32 SignedBase = -100\ni32 SignedResult = 0\nSum = A + B\nDifference = A - B\nLiteralSum = A + 5\nSignedResult = SignedBase - -5\nA = A + B\nB = A - B\nloop forever\n`,
    expected: {
      Sum: [0xF0, 0x49, 0x02, 0x00],
      Difference: [0x50, 0xC3, 0x00, 0x00],
      LiteralSum: [0xA5, 0x86, 0x01, 0x00],
      SignedResult: [0xA1, 0xFF, 0xFF, 0xFF],
      A: [0xF0, 0x49, 0x02, 0x00],
      B: [0xA0, 0x86, 0x01, 0x00]
    }
  },
  {
    name: "wide-local-binary-expression",
    source: `u32 LocalResult = 0\ni32 SignedLocalResult = 0\nsub ComputeWide:\n  u32 Left = 70000\n  u32 Right = 30000\n  u32 Result = 0\n  i32 SignedLeft = -70000\n  i32 SignedRight = 30000\n  i32 SignedResult = 0\n  Result = Left + Right\n  SignedResult = SignedLeft - SignedRight\n  LocalResult = Result\n  SignedLocalResult = SignedResult\nend sub\nComputeWide\nloop forever\n`,
    expected: {
      LocalResult: [0xA0, 0x86, 0x01, 0x00],
      SignedLocalResult: [0x60, 0x79, 0xFE, 0xFF]
    }
  },
  {
    name: "wide-array-indexes",
    source: `u32 Wide[5] = 100000\ni32 SignedWide[3] = -100\nu8 Index = 1\nu32 ConstantOut = 0\nu32 VariableOut = 0\nu32 ExpressionOut = 0\ni32 SignedOut = 0\nWide[0] = Wide[0] + 5\nWide[Index] = Wide[0] + 10\nWide[Index + 1] = Wide[Index] - 20\nSignedWide[Index] = SignedWide[0] - 5\ninc Wide[3]\ndec Wide[3]\nConstantOut = Wide[0]\nVariableOut = Wide[Index]\nExpressionOut = Wide[Index + 1]\nSignedOut = SignedWide[Index]\nloop forever\n`,
    expected: {
      ConstantOut: [0xA5, 0x86, 0x01, 0x00],
      VariableOut: [0xAF, 0x86, 0x01, 0x00],
      ExpressionOut: [0x9B, 0x86, 0x01, 0x00],
      SignedOut: [0x97, 0xFF, 0xFF, 0xFF]
    }
  },
  {
    name: "wide-local-array-indexes",
    source: `u32 LocalArrayOut = 0\ni32 SignedLocalArrayOut = 0\nsub ComputeWideArrays:\n  u32 Values[3] = 1000\n  i32 SignedValues[3] = -1000\n  u8 Index = 1\n  Values[Index] = Values[0] + 25\n  SignedValues[Index + 1] = SignedValues[0] - 25\n  LocalArrayOut = Values[Index]\n  SignedLocalArrayOut = SignedValues[Index + 1]\nend sub\nComputeWideArrays\nloop forever\n`,
    expected: {
      LocalArrayOut: [0x01, 0x04, 0x00, 0x00],
      SignedLocalArrayOut: [0xFF, 0xFB, 0xFF, 0xFF]
    }
  },
  {
    name: "wide-qualified-fields",
    source: `record WideState:\n  u8 Guard\n  u32 Score\n  i32 Delta\n  u32 History[2]\n  u8 Tail\nend record\nWideState Direct\noverlay SceneRam\n  Menu as WideState\n  Game as WideState\nend overlay\nu8 Index = 1\nu8 GuardOut = 0\nu8 TailOut = 0\nu8 OverlayGuardOut = 0\nu32 DirectOut = 0\ni32 OverlayOut = 0\nu32 ArrayOut = 0\nDirect.Guard = 77\nDirect.Tail = 88\nDirect.Score = 100000\nDirect.Score = Direct.Score + 50000\ninc Direct.Score\ndec Direct.Score\nSceneRam.Game.Guard = 66\nSceneRam.Game.Delta = -100\nSceneRam.Game.Delta = SceneRam.Game.Delta - 5\nSceneRam.Game.History[Index] = Direct.Score + 25\nGuardOut = Direct.Guard\nTailOut = Direct.Tail\nOverlayGuardOut = SceneRam.Game.Guard\nDirectOut = Direct.Score\nOverlayOut = SceneRam.Game.Delta\nArrayOut = SceneRam.Game.History[Index]\nloop forever\n`,
    expected: {
      GuardOut: 77,
      TailOut: 88,
      OverlayGuardOut: 66,
      DirectOut: [0xF0, 0x49, 0x02, 0x00],
      OverlayOut: [0x97, 0xFF, 0xFF, 0xFF],
      ArrayOut: [0x09, 0x4A, 0x02, 0x00]
    }
  },
  {
    name: "wide-literal-subtract-writeback",
    source: `record CounterState:\n  u8 Guard\n  u32 Value\n  u8 Tail\nend record\nu32 GlobalValue = 100000\nu32 ArrayValue[2] = 100000\nCounterState Direct\noverlay CounterRam\n  Menu as CounterState\n  Game as CounterState\nend overlay\nu8 Index = 1\nu8 GuardOut = 0\nu8 TailOut = 0\nu32 GlobalOut = 0\nu32 ArrayOut = 0\nu32 RecordOut = 0\nu32 OverlayOut = 0\nDirect.Guard = 71\nDirect.Tail = 72\nDirect.Value = 100000\nCounterRam.Game.Value = 100000\nGlobalValue -= 1\nArrayValue[Index] -= 1\nDirect.Value -= 1\nCounterRam.Game.Value -= 1\nGuardOut = Direct.Guard\nTailOut = Direct.Tail\nGlobalOut = GlobalValue\nArrayOut = ArrayValue[Index]\nRecordOut = Direct.Value\nOverlayOut = CounterRam.Game.Value\nloop forever\n`,
    expected: {
      GuardOut: 71,
      TailOut: 72,
      GlobalOut: [0x9F, 0x86, 0x01, 0x00],
      ArrayOut: [0x9F, 0x86, 0x01, 0x00],
      RecordOut: [0x9F, 0x86, 0x01, 0x00],
      OverlayOut: [0x9F, 0x86, 0x01, 0x00]
    }
  },
  {
    name: "qualified-mutator-results",
    source: `record Flags:\n  u8 ByteValue\n  u16 WordValue\nend record\nFlags Direct\noverlay StateRam\n  Menu as Flags\n  Game as Flags\nend overlay\nu8 ByteOut = 0\nu16 WordOut = 0\nDirect.ByteValue = $F3\nDirect.ByteValue &= $0F\nDirect.ByteValue |= $80\nDirect.ByteValue <<= 2\nDirect.ByteValue >>= 1\nStateRam.Menu.WordValue = $1234\nStateRam.Menu.WordValue <<= 2\nStateRam.Menu.WordValue >>= 2\nByteOut = Direct.ByteValue\nWordOut = StateRam.Menu.WordValue\nloop forever\n`,
    expected: { ByteOut: 6, WordOut: [0x34, 0x12] }
  }
];

function compile(sourcePath, asmPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      stdio: "ignore"
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`compile failed: ${profile}`)));
  });
}

function symbolAddress(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]+)`, "m"));
  assert.ok(match, `missing symbol ${name}`);
  return Number.parseInt(match[1], 16);
}

const outputDir = await mkdtemp(join(tmpdir(), "amy-global-init-"));
try {
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    for (const testCase of cases) {
      const stem = join(outputDir, `${testCase.name}-${profile}`);
      const sourcePath = `${stem}.alexis`;
      const asmPath = `${stem}.asm`;
      const romPath = `${stem}.rom`;
      await writeFile(sourcePath, `project "GLOBAL INIT ${testCase.name}"\n${testCase.source}`);
      await compile(sourcePath, asmPath, romPath, profile);
      const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
      rom[0] = 0x55;
      rom[1] = 0xaa;
      const core = await GearcolecoTestCore.create({ seed: 0x494e4954 });
      try {
        core.loadBios(bios);
        core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
        for (let frame = 0; frame < 5; frame += 1) core.runFrame();
        for (const [name, expected] of Object.entries(testCase.expected)) {
          const address = symbolAddress(asm, name);
          if (Array.isArray(expected)) {
            assert.deepEqual([...core.readRam(address, expected.length)], expected, `${profile}/${testCase.name}/${name} at $${address.toString(16)}`);
          } else {
            assert.equal(core.readRam(address, 1)[0], expected, `${profile}/${testCase.name}/${name} at $${address.toString(16)}`);
          }
        }
      } finally {
        core.destroy();
      }
    }
  }
  console.log(`Global initializer ROM self-test PASS (${cases.length} layouts x ${profiles.length} profiles)`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
