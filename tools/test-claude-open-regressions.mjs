#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools/amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-claude-open-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

const runtimeSource = join(temp, "claude-open-runtime.alexis");
writeFileSync(runtimeSource, `project "CLAUDE OPEN REGRESSIONS"
memory "colecovision_legacy_sdcc"
data T bytes 10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25
const TA = 130
data CaseTable bytes Ta,5
data Tab bytes 3,1,4,1
u16 B = 3
u16 N = 4
u16 P = $1234
u8 Q = 5
u16 R1 = 0
u16 R2 = 0
u8 Hand[20]
u8 I = 1
u8 Hi = 10
u8 ArgResult = 0
u8 ReturnResult = 0
u8 Done = 0
u8 CaseDataResult = 0
u8 CaseResult = 0
u16 SelectValue = 250
u16 At = 5
u16 WideArrayResult = 0
u16 WideFieldResult = 0
record Mine:
  u8 X
  u8 Y
  u8 State
end record
Mine Mines[3]
u8 MineIndex = 1
u8 MinePattern = 16
u8 MineColor = 8

function IsA(u8 T) as u8
  if T = 65 then return 1
  return 0

function CellAt(u8 X, u8 Y) as u8
  return get char at X,Y

function Twice16(u16 Value) as u16
  return Value + Value

sub start:
  tile screen
  nmi off
  fill array Hand with 0
  copy T + B count N to vram.name
  copy T count N to vram.name + 32
  copy T count N to vram $1C00 + 672
  R1 = Q * 256 + lowbyte P
  R2 = highbyte P + 1
  inc Hand[Tab[I]]
  inc Hand[Hi + Tab[I]]
  inc Hand[Hi + Tab[I]]
  dec Hand[Hi + Tab[I]]
  put char 65 at 5,6
  ArgResult = IsA(get char at 5,6)
  ReturnResult = CellAt(5,6)
  WideArrayResult = Twice16(Hand[I])
  CaseDataResult = CaseTable[0]
  select case SelectValue
    case is < 100
      CaseResult = 1
    case is < 300
      CaseResult = 2
    case else
      CaseResult = 3
  end select
  print At at 2,4 width 3
  sprites 16x16
  clear sprites
  set sprite count 4
  Mines[1].X = 220
  Mines[1].Y = 70
  WideFieldResult = Twice16(Mines[MineIndex].Y)
  set sprite 2 to Mines[MineIndex].Y,Mines[MineIndex].X,MinePattern,MineColor
  update sprites
  Done = 1
  loop forever
end sub
`);

const aliasSource = join(temp, "claude-open-alias.alexis");
writeFileSync(aliasSource, `project "CALL ASM REACHABILITY"
record Guard:
  u8 X
end record
Guard G[2]
u8 N = 0
sub start:
  Walk(0)
  loop forever
end sub
sub Walk(u8 I):
  with G[I] as Gm
    Gm.X = Gm.X + 1
  end with
end sub
sub Bump:
  call asm Leaf
end sub
asm {
Leaf:
  ld a,1
  ret
}
`);

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

function compile(source, profile, stem) {
  const asmPath = join(temp, `${stem}-${profile}.asm`);
  const romPath = join(temp, `${stem}-${profile}.rom`);
  const result = spawnSync(process.execPath, [amyc, source, "--asm", asmPath, "--rom", romPath, "--opt", profile], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  assert.equal(result.status, 0, `${profile}/${stem}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);
  return { asm: readFileSync(asmPath, "utf8"), rom: readFileSync(romPath) };
}

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    compile(aliasSource, profile, "alias");
    const built = compile(runtimeSource, profile, "runtime");
    const core = await GearcolecoTestCore.create({ seed: 0x434C4155 });
    try {
      core.loadBios(bios);
      core.loadRom(built.rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      const done = addressOf(built.asm, "AMY_UVAR_Done");
      for (let frame = 0; frame < 30 && core.readRam(done, 1)[0] !== 1; frame += 1) core.runFrame();
      assert.equal(core.readRam(done, 1)[0], 1, `${profile}: completion marker`);
      assert.deepEqual([...core.readVram(0x1800, 4)], [13, 14, 15, 16], `${profile}: offset ROM-to-VRAM copy`);
      assert.deepEqual([...core.readVram(0x1820, 4)], [10, 11, 12, 13], `${profile}: direct ROM-to-VRAM copy`);
      assert.deepEqual([...core.readVram(0x1EA0, 4)], [10, 11, 12, 13], `${profile}: literal VRAM base plus offset`);
      const r1 = core.readRam(addressOf(built.asm, "AMY_UVAR_R1"), 2);
      const r2 = core.readRam(addressOf(built.asm, "AMY_UVAR_R2"), 2);
      assert.equal(r1[0] | (r1[1] << 8), 0x0534, `${profile}: lowbyte expression`);
      assert.equal(r2[0] | (r2[1] << 8), 0x13, `${profile}: highbyte expression`);
      const hand = addressOf(built.asm, "AMY_UVAR_Hand");
      assert.equal(core.readRam(hand + 1, 1)[0], 1, `${profile}: nested inc target`);
      assert.equal(core.readRam(hand + 11, 1)[0], 1, `${profile}: nested inc/dec target`);
      assert.equal(core.readRam(addressOf(built.asm, "AMY_UVAR_ArgResult"), 1)[0], 1, `${profile}: get char argument`);
      assert.equal(core.readRam(addressOf(built.asm, "AMY_UVAR_ReturnResult"), 1)[0], 65, `${profile}: get char return`);
      assert.equal(core.readRam(addressOf(built.asm, "AMY_UVAR_CaseDataResult"), 1)[0], 130, `${profile}: case-insensitive data constant`);
      assert.equal(core.readRam(addressOf(built.asm, "AMY_UVAR_CaseResult"), 1)[0], 2, `${profile}: relational select case`);
      const wideArray = core.readRam(addressOf(built.asm, "AMY_UVAR_WideArrayResult"), 2);
      const wideField = core.readRam(addressOf(built.asm, "AMY_UVAR_WideFieldResult"), 2);
      assert.equal(wideArray[0] | (wideArray[1] << 8), 2, `${profile}: byte array element widened for u16 parameter`);
      assert.equal(wideField[0] | (wideField[1] << 8), 140, `${profile}: byte record field widened for u16 parameter`);
      assert.deepEqual([...core.readVram(0x1882, 3)], [32, 32, 53], `${profile}: value-first print with At variable`);
      assert.deepEqual([...core.readVram(0x1B08, 4)], [70, 220, 16, 8], `${profile}: record-field sprite inputs`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Claude open regressions: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
