#!/usr/bin/env node
// Codegen tests for by-reference parameters: `sub Move(ref Actor a)` / `sub Bump(ref u8 v)`.
// Verifies caller pushes an address, callee dereferences through IX/HL with constant
// offsets, and unsupported forms fail loudly instead of miscompiling.
import assert from "node:assert/strict";

import { getRamLayout } from "../studio/ramLayouts.js";
import {
  inferAmyMemoryCapabilities,
  parseCartridgeDirective as parseCartridgeDirectiveCore,
  parseExpressionAst as parseExpressionAstCore,
  renderExpressionAst as renderExpressionAstCore,
  rewriteImmediateByteTempCoordinateUses as rewriteImmediateByteTempCoordinateUsesCore
} from "../studio/core/compilerFrontend.js";
import { emitSafeCall as emitSafeCallCore } from "../studio/core/compiler/runtimeCallHelpers.js";
import { createBcdHelpers } from "../studio/core/compiler/bcdHelpers.js";
import { createAddressHelpers } from "../studio/core/compiler/addressHelpers.js";
import { handleArrayBulkStatement } from "../studio/core/compiler/arrayBulkStatementHelpers.js";
import { createAssignmentArithmeticHelpers } from "../studio/core/compiler/assignmentArithmeticHelpers.js";
import { createFx16Helpers } from "../studio/core/compiler/fx16Helpers.js";
import { createByteLoadHelpers } from "../studio/core/compiler/byteLoadHelpers.js";
import { createCompareLiteralHelpers } from "../studio/core/compiler/compareLiteralHelpers.js";
import { createCompilerShellHelpers } from "../studio/core/compiler/compilerShellHelpers.js";
import { createDataHelpers } from "../studio/core/compiler/dataHelpers.js";
import { handleDataMetaStatement } from "../studio/core/compiler/dataMetaStatementHelpers.js";
import { handleDataCursorStatement } from "../studio/core/compiler/dataCursorStatementHelpers.js";
import { handleDeclarationStatement } from "../studio/core/compiler/declarationStatementHelpers.js";
import { createControlFlowHelpers } from "../studio/core/compiler/controlFlowHelpers.js";
import { createExpressionComputeHelpers } from "../studio/core/compiler/expressionComputeHelpers.js";
import { scanAmyFirstPass } from "../studio/core/compiler/firstPassScanHelpers.js";
import { handleDisplayGraphicsSpriteStatement } from "../studio/core/compiler/displayGraphicsSpriteStatementHelpers.js";
import { handleForStatement } from "../studio/core/compiler/forStatementHelpers.js";
import { handleIfStatement } from "../studio/core/compiler/ifStatementHelpers.js";
import { createInlineStatementCompiler } from "../studio/core/compiler/inlineStatementHelpers.js";
import { createLoadStoreHelpers } from "../studio/core/compiler/loadStoreHelpers.js";
import { handleDoStatement, handleWhileStatement } from "../studio/core/compiler/loopStatementHelpers.js";
import { handleMathBitStatement } from "../studio/core/compiler/mathBitStatementHelpers.js";
import { handleMutateStatement } from "../studio/core/compiler/mutateStatementHelpers.js";
import { createPrintHelpers } from "../studio/core/compiler/printHelpers.js";
import { handlePrintFormatStatement } from "../studio/core/compiler/printFormatStatementHelpers.js";
import { createProcHelpers } from "../studio/core/compiler/procHelpers.js";
import { handleProcFunctionStatement } from "../studio/core/compiler/procFunctionStatementHelpers.js";
import { handleDispatchLabelStatement } from "../studio/core/compiler/dispatchLabelStatementHelpers.js";
import { handleRandomBounceStatement } from "../studio/core/compiler/randomBounceStatementHelpers.js";
import { handleRoutineStatement } from "../studio/core/compiler/routineStatementHelpers.js";
import { handleSpecialIfGotoStatement } from "../studio/core/compiler/specialIfGotoStatementHelpers.js";
import { createRuntimeValueHelpers } from "../studio/core/compiler/runtimeValueHelpers.js";
import { handleSelectCaseStatement } from "../studio/core/compiler/selectCaseStatementHelpers.js";
import { createSimpleArithmeticHelpers } from "../studio/core/compiler/simpleArithmeticHelpers.js";
import { handleSoundSpinnerStatement } from "../studio/core/compiler/soundSpinnerStatementHelpers.js";
import { createTypeSymbolHelpers } from "../studio/core/compiler/typeSymbolHelpers.js";
import { createU32Helpers } from "../studio/core/compiler/u32Helpers.js";
import { createValueParseHelpers } from "../studio/core/compiler/valueParseHelpers.js";
import { finalizeAmyTranspile } from "../studio/core/compiler/transpileFinalizationHelpers.js";
import { handleVramTextStatement } from "../studio/core/compiler/vramTextStatementHelpers.js";
import { handleVramPixelInputStatement } from "../studio/core/compiler/vramPixelInputStatementHelpers.js";
import { transpileAmyCore } from "../studio/core/compiler/transpileAmyCore.js";
import { sourceHintsTinySound, getOptimizationProfile } from "../studio/core/optimization.js";
import { assembleAmysCVAssembly } from "../studio/vendor/amyscvassembly/compilerCore.js";

function stripAmyInlineComment(rawLine) {
  const text = String(rawLine || "");
  let inString = false;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (ch === "\"") {
      if (inString && text[index + 1] === "\"") { index += 1; continue; }
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "'" || ch === ";") return text.slice(0, index).trimEnd();
    if ((ch === "r" || ch === "R") && text.slice(index, index + 3).toLowerCase() === "rem") {
      const prev = index === 0 ? "" : text[index - 1];
      const next = index + 3 >= text.length ? "" : text[index + 3];
      if ((!prev || /\s/.test(prev)) && (!next || /\s/.test(next))) return text.slice(0, index).trimEnd();
    }
  }
  return text;
}

const DEPS = {
  rewriteImmediateByteTempCoordinateUsesCore,
  inferAmyMemoryCapabilities,
  sourceHintsTinySound,
  getRamLayout,
  emitSafeCallCore,
  parseCartridgeDirectiveCore,
  parseExpressionAstCore,
  renderExpressionAstCore,
  createTypeSymbolHelpers,
  createProcHelpers,
  createValueParseHelpers,
  createExpressionComputeHelpers,
  createRuntimeValueHelpers,
  createCompareLiteralHelpers,
  createPrintHelpers,
  createBcdHelpers,
  createControlFlowHelpers,
  createCompilerShellHelpers,
  createDataHelpers,
  createLoadStoreHelpers,
  createByteLoadHelpers,
  createAddressHelpers,
  createU32Helpers,
  createFx16Helpers,
  createSimpleArithmeticHelpers,
  createAssignmentArithmeticHelpers,
  scanAmyFirstPass,
  handleDataMetaStatement,
  handleDeclarationStatement,
  handleProcFunctionStatement,
  handleDisplayGraphicsSpriteStatement,
  handleSoundSpinnerStatement,
  handleVramTextStatement,
  handlePrintFormatStatement,
  handleVramPixelInputStatement,
  handleDataCursorStatement,
  handleWhileStatement,
  handleDoStatement,
  handleIfStatement,
  handleSelectCaseStatement,
  handleForStatement,
  handleRandomBounceStatement,
  handleSpecialIfGotoStatement,
  handleDispatchLabelStatement,
  handleRoutineStatement,
  handleMutateStatement,
  handleMathBitStatement,
  handleArrayBulkStatement,
  createInlineStatementCompiler,
  finalizeAmyTranspile,
  stripAmyInlineComment
};

function transpileAmy(sourceText) {
  return transpileAmyCore(sourceText, DEPS);
}

const failures = [];
function check(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`FAIL ${name}\n     ${error.message}`);
  }
}

const REF_DEMO = `record Actor:
  u8 X
  u8 Y
  u16 Score
end record

Actor Hero
Actor Foes[3]
u8 Counter = 0
u16 Total = 0

sub MoveActor(ref Actor A, u8 Dx):
  A.X += Dx
  A.Y += 1
  A.Score += 10
end sub

sub BumpByte(ref u8 V):
  inc V
  V += 2
end sub

sub BumpWord(ref u16 W):
  inc W
end sub

MoveActor(Hero, 3)
MoveActor(Foes[1], 2)
BumpByte(Counter)
BumpByte(Hero.X)
BumpWord(Total)
loop forever
`;

const result = transpileAmy(REF_DEMO);

check("ref demo transpiles", () => {
  assert.equal(result.ok, true, result.log || "transpile failed");
});

const asm = String(result?.asmBody || "");
if (process.env.DUMP_ASM) console.log(asm);

check("callee dereferences record ref through IX slot into HL", () => {
  assert.match(asm, /ld l,\(ix\+4\)\s*\n\s*ld h,\(ix\+5\)/, "expected pointer load ld l,(ix+4)/ld h,(ix+5)");
});

check("record field at offset 1 uses inc hl, not ld de", () => {
  assert.match(asm, /ld l,\(ix\+4\)\s*\n\s*ld h,\(ix\+5\)\s*\n\s*inc hl/, "A.Y should be reached with a single inc hl");
});

check("caller passes global record address as a constant", () => {
  assert.match(asm, /ld hl,\$[0-9A-F]{4}\s*\n\s*push hl\s*\n\s*call AMY_UPROC_MoveActor/i, "expected ld hl,$addr / push hl right before call MoveActor");
});

check("byte ref writes through (hl), never to the slot", () => {
  assert.match(asm, /ld l,\(ix\+4\)\s*\n\s*ld h,\(ix\+5\)\s*\n\s*inc \(hl\)/, "inc V should emit inc (hl) after pointer load");
  assert.doesNotMatch(asm, /inc \(ix\+4\)/, "inc V must not increment the pointer slot");
});

check("no hidden runtime call in ref codegen", () => {
  const bumpByte = asm.split(/BumpByte:/)[1]?.split(/\n[A-Za-z_]\w*:/)[0] || "";
  assert.ok(bumpByte.length > 0, "BumpByte body not found");
  assert.doesNotMatch(bumpByte, /call\s+AMY_/, "ref scalar codegen must not call runtime helpers");
});

const REF_LOCAL_ROUNDTRIP = `record Triple:
  u8 A
  u8 B
  u8 C
end record

Triple Value

sub Rewrite(ref Triple P):
  u8 X = 0
  u8 Y = 0
  u8 Z = 0
  X = P.A
  Y = P.B
  Z = P.C
  P.A = X
  P.B = Y
  P.C = Z
end sub

Rewrite(Value)
loop forever
`;

const refLocalResult = transpileAmy(REF_LOCAL_ROUNDTRIP);
const refLocalAsm = String(refLocalResult?.asmBody || "");

check("ref record fields round-trip through distinct locals", () => {
  assert.equal(refLocalResult.ok, true, refLocalResult.log || "transpile failed");
  assert.match(refLocalAsm, /ld a,\(ix-1\)/, "expected first local X");
  assert.match(refLocalAsm, /ld a,\(ix-2\)/, "expected second local Y");
  assert.match(refLocalAsm, /ld a,\(ix-3\)/, "expected third local Z");
  assert.ok(refLocalAsm.split("ld a,(hl)").length - 1 >= 3, "expected three distinct indirect field reads");
  assert.match(refLocalAsm, /ld l,\(ix\+4\)\s*\n\s*ld h,\(ix\+5\)\s*\n\s*ld \(hl\),a/, "expected P.A store");
  assert.match(refLocalAsm, /ld l,\(ix\+4\)\s*\n\s*ld h,\(ix\+5\)\s*\n\s*inc hl\s*\n\s*ld \(hl\),a/, "expected P.B store");
  assert.match(refLocalAsm, /ld l,\(ix\+4\)\s*\n\s*ld h,\(ix\+5\)\s*\n\s*inc hl\s*\n\s*inc hl\s*\n\s*ld \(hl\),a/, "expected P.C store");
});

const DYNAMIC_INPUT_DEMO = `u8 Port = 1
u8 Key = 0
u8 Pressed = 0

Key = keypad(Port)
if joypad(Port).button1 then Pressed = 1
if joypad(1).fire then Pressed = 1
if joypad(Port).action then Pressed = 1
Pressed = joypad(2).action
loop forever
`;

const dynamicInputResult = transpileAmy(DYNAMIC_INPUT_DEMO);
const dynamicInputAsm = String(dynamicInputResult?.asmBody || "");

check("keypad and joypad accept a runtime port expression", () => {
  assert.equal(dynamicInputResult.ok, true, dynamicInputResult.log || "transpile failed");
  assert.match(dynamicInputAsm, /cp 1\s*\n\s*jr z,/i, "expected runtime port selection");
  assert.match(dynamicInputAsm, /ld a,\(KEYPAD_2\)/i, "expected keypad port 2 path");
  assert.match(dynamicInputAsm, /ld a,\(KEYPAD_1\)/i, "expected keypad port 1 path");
  assert.match(dynamicInputAsm, /ld a,\(JOYPAD_2\)/i, "expected joypad port 2 path");
  assert.match(dynamicInputAsm, /ld a,\(JOYPAD_1\)/i, "expected joypad port 1 path");
  assert.match(dynamicInputAsm, /bit 7,a/i, "expected button1 bit test");
  assert.match(dynamicInputAsm, /ld a,\(JOYPAD_1\)\s*\n\s*and \$C0/i, "expected one-read standard fire mask");
  assert.match(dynamicInputAsm, /and \$F0/i, "expected four-button action mask");
  assert.match(dynamicInputAsm, /and \$F0[\s\S]*jr z,[^\n]+[\s\S]*ld a,1/i, "expected boolean normalization for action assignment");
});
check("record parameter without ref is a clear error", () => {
  const bad = transpileAmy("record P:\n  u8 X\nend record\n\nP Thing\n\nsub Move(P A):\n  inc A.X\nend sub\n\nMove(Thing)\nloop forever\n");
  assert.equal(bad.ok, false);
  assert.match(String(bad.log || ""), /ref/i, "error should suggest ref");
});

check("ref u32 parameter dereferences its pointer slot", () => {
  const result = transpileAmy("u32 Big = 0\n\nsub Grow(ref u32 V):\n  inc V\nend sub\n\nGrow(Big)\nloop forever\n");
  assert.equal(result.ok, true, result.log || "transpile failed");
  assert.match(result.asmBody, /ld l,\(ix\+4\)\s*\n\s*ld h,\(ix\+5\)/i);
});

check("literal argument to a ref parameter is rejected", () => {
  const bad = transpileAmy("u8 N = 0\n\nsub Bump(ref u8 V):\n  inc V\nend sub\n\nBump(5)\nloop forever\n");
  assert.equal(bad.ok, false, "passing a literal to ref must fail");
});

check("type mismatch u8 arg to ref u16 parameter is rejected", () => {
  const bad = transpileAmy("u8 N = 0\n\nsub Grow(ref u16 W):\n  inc W\nend sub\n\nGrow(N)\nloop forever\n");
  assert.equal(bad.ok, false, "u8 variable must not bind to ref u16");
});

check("same-width ref types still require an exact declared type", () => {
  const signedMismatch = transpileAmy("i16 N = 0\n\nsub Grow(ref u16 W):\n  inc W\nend sub\n\nGrow(N)\nloop forever\n");
  assert.equal(signedMismatch.ok, false, "i16 must not bind to ref u16");
  const fixedMismatch = transpileAmy("u16 N = 0\n\nsub Move(ref fixed W):\n  W += 1.0\nend sub\n\nMove(N)\nloop forever\n");
  assert.equal(fixedMismatch.ok, false, "u16 must not bind to ref fixed");
});

const overlayMetadataResult = transpileAmy(`memory "colecovision_legacy_sdcc"
state machine Scenes:
  Menu calls MenuFrame
  Game calls GameFrame
end state machine
record Actor:
  u8 X
  u8 Flags[3]
end record
record GameMemory:
  Actor Actors[2]
  bcd digits 3 Score
end record
record MenuMemory:
  u8 Selection
end record
overlay SceneRam
  Menu as MenuMemory
  Game as GameMemory
end overlay
u8 ActiveScene = Scenes.Menu
bind overlay SceneRam to ActiveScene using Scenes
loop forever
sub MenuFrame:
  return
end sub
sub GameFrame:
  return
end sub
`);

check("overlay metadata preserves logical fields and shared addresses", () => {
  assert.equal(overlayMetadataResult.ok, true, overlayMetadataResult.log || "overlay metadata transpile failed");
  const overlay = overlayMetadataResult.metadata?.ramOverlays?.[0];
  assert.equal(overlay?.name, "SceneRam");
  const menu = overlay.parts.find((part) => part.name === "Menu");
  const game = overlay.parts.find((part) => part.name === "Game");
  assert.equal(menu.fields[0].qualifiedName, "SceneRam.Menu.Selection");
  assert.equal(menu.fields[0].asmName, "AMY_SCENE_Menu_Selection");
  assert.equal(menu.fields[0].address, overlay.address);
  assert.deepEqual(menu.fields[0].activeWhen, { symbol: "AMY_UVAR_ActiveScene", equals: 1 });
  const actors = game.fields.find((field) => field.qualifiedName === "SceneRam.Game.Actors");
  assert.deepEqual(
    { type: actors.type, length: actors.length, elementSize: actors.elementSize, address: actors.address },
    { type: "record_array", length: 2, elementSize: 4, address: overlay.address }
  );
  const score = game.fields.find((field) => field.qualifiedName === "SceneRam.Game.Score");
  assert.deepEqual(
    { type: score.type, width: score.width, digitCount: score.digitCount, byteCount: score.byteCount },
    { type: "bcd", width: 2, digitCount: 3, byteCount: 2 }
  );
  assert.deepEqual(game.fields[0].activeWhen, { symbol: "AMY_UVAR_ActiveScene", equals: 2 });
});
check("overlay binding rejects a non-u8 selector", () => {
  const bad = transpileAmy(`memory "colecovision_legacy_sdcc"
state machine Scenes:
  Menu calls MenuFrame
  Game calls GameFrame
end state machine
record Mem:
  u8 Value
end record
overlay SceneRam
  Menu as Mem
  Game as Mem
end overlay
i16 ActiveScene = 1
bind overlay SceneRam to ActiveScene using Scenes
loop forever
sub MenuFrame:
  return
end sub
sub GameFrame:
  return
end sub
`);
  assert.equal(bad.ok, false);
  assert.match(bad.log, /must be a global u8 variable/i);
});
check("overlay ref rejection explains part-scoped lifetime", () => {
  const source = (callLine) => `memory "colecovision_legacy_sdcc"
record MenuMemory:
  u8 Selection
end record
overlay SceneRam
  Menu as MenuMemory
  Game as MenuMemory
end overlay
sub start:
  ${callLine}
  loop forever
end sub
sub Bump(ref u8 Value):
  Value += 1
  return
end sub
`;
  for (const callLine of ["Bump(SceneRam.Menu.Selection)", "if 1 then Bump(SceneRam.Menu.Selection)"]) {
    const bad = transpileAmy(source(callLine));
    assert.equal(bad.ok, false, `${callLine} must reject overlay ref escape`);
    assert.match(bad.log, /overlay-qualified field 'SceneRam\.Menu\.Selection'.*part-scoped lifetime/i);
  }
});
const sceneDeclarationSource = `memory "colecovision_legacy_sdcc"
record MenuMemory:
  u8 Selection
end record
record GameMemory:
  u8 PlayerX
end record
overlay SceneRam
  Menu as MenuMemory
  Game as GameMemory
end overlay
scene Menu uses SceneRam.Menu
  on enter MenuEnter
  on frame MenuFrame
end scene
scene Game uses SceneRam.Game
  on enter GameEnter
  on frame GameFrame
end scene
u8 Initial = Scenes.Menu
enter Menu
loop forever
sub MenuEnter:
  SceneRam.Menu.Selection = 3
  return
end sub
sub MenuFrame:
  return
end sub
sub GameEnter:
  return
end sub
sub GameFrame:
  return
end sub
`;
const sceneDeclarationResult = transpileAmy(sceneDeclarationSource);
check("scene declarations create typed IDs and active-part metadata", () => {
  assert.equal(sceneDeclarationResult.ok, true, sceneDeclarationResult.log || "scene declaration transpile failed");
  assert.match(sceneDeclarationResult.asmBody, /AMY_ACTIVE_SCENE EQU \$[0-9A-F]{4}/i);
  assert.match(sceneDeclarationResult.asmBody, /call AMY_VRAM_BEGIN[\s\S]*ld \(AMY_ACTIVE_SCENE\),a[\s\S]*ld \((?:AMY_SCENE_Menu_Selection|\$7020)\),a[\s\S]*ld a,1[\s\S]*call AMY_VRAM_END/i);
  assert.match(sceneDeclarationResult.asmBody, /ld \(AMY_UVAR_Initial\),a/i);
  assert.equal(sceneDeclarationResult.metadata.onFrameHook.asmLabel, "AMY_SCENE_FRAME_DISPATCH");
  assert.match(sceneDeclarationResult.asmBody, /AMY_SCENE_FRAME_DISPATCH:[\s\S]*ld a,\(AMY_ACTIVE_SCENE\)[\s\S]*jp z,AMY_SCENE_FRAME_1[\s\S]*jp z,AMY_SCENE_FRAME_2/i);
  assert.match(sceneDeclarationResult.asmBody, /AMY_SCENE_FRAME_1:\s*jp AMY_UPROC_MenuFrame/i);
  assert.match(sceneDeclarationResult.asmBody, /AMY_SCENE_FRAME_2:\s*jp AMY_UPROC_GameFrame/i);
  const overlay = sceneDeclarationResult.metadata.ramOverlays[0];
  assert.equal(overlay.activeBinding.symbol, "AMY_ACTIVE_SCENE");
  assert.deepEqual(overlay.parts.map((part) => part.activeWhen.equals), [1, 2]);
  assert.deepEqual(overlay.scenes.map((scene) => scene.enterRoutine), ["MenuEnter", "GameEnter"]);
});
check("scene poison is opt-in and runs before enter initialization", () => {
  const releaseResult = transpileAmy(sceneDeclarationSource);
  assert.equal(releaseResult.ok, true, releaseResult.log);
  assert.doesNotMatch(releaseResult.asmBody, /AMY_SCENE_DEBUG_POISON/i);
  assert.equal(releaseResult.metadata.ramOverlays[0].debugPoison, undefined);

  const debugResult = transpileAmy(`define AMY_DEBUG_SCENE_POISON\n${sceneDeclarationSource}`);
  assert.equal(debugResult.ok, true, debugResult.log);
  assert.equal(debugResult.metadata.ramOverlays[0].debugPoison, 0xCD);
  assert.match(debugResult.asmBody, /call AMY_VRAM_BEGIN[\s\S]*ld \(AMY_ACTIVE_SCENE\),a[\s\S]*call AMY_SCENE_DEBUG_POISON[\s\S]*ld a,3[\s\S]*ld \((?:AMY_SCENE_Menu_Selection|\$7020)\),a[\s\S]*ld \(AMY_ACTIVE_SCENE\),a[\s\S]*call AMY_VRAM_END/i);
  assert.match(debugResult.asmBody, /AMY_SCENE_DEBUG_POISON:\s*ld hl,\$[0-9A-F]{4}\s*ld \(hl\),\$CD\s*ret/i);

  const inactiveDefineResult = transpileAmy(`ifdef NEVER\ndefine AMY_DEBUG_SCENE_POISON\nend ifdef\n${sceneDeclarationSource}`);
  assert.equal(inactiveDefineResult.ok, true, inactiveDefineResult.log);
  assert.doesNotMatch(inactiveDefineResult.asmBody, /AMY_SCENE_DEBUG_POISON/i);
});
check("scene enter rejects a reachable wait", () => {
  const bad = transpileAmy(`memory "colecovision_legacy_sdcc"
record Mem:
  u8 Value
end record
overlay SceneRam
  Menu as Mem
  Game as Mem
end overlay
scene Menu uses SceneRam.Menu
  on enter MenuEnter
  on frame MenuFrame
end scene
scene Game uses SceneRam.Game
  on enter GameEnter
  on frame GameFrame
end scene
enter Menu
loop forever
sub MenuEnter:
  wait 1 frames
  return
end sub
sub MenuFrame:
  return
end sub
sub GameEnter:
  return
end sub
sub GameFrame:
  return
end sub
`);
  assert.equal(bad.ok, false);
  assert.match(bad.log, /on enter path is not NMI-safe/i);
});
check("scene frame rejects a reachable blocking statement", () => {
  const source = sceneDeclarationSource.replace("sub MenuFrame:\n  return", "sub MenuFrame:\n  wait 1 frames\n  return");
  const bad = transpileAmy(source);
  assert.equal(bad.ok, false);
  assert.match(bad.log, /on frame path is not NMI-safe/i);
});
check("scenes reject a separate top-level on frame hook", () => {
  const bad = transpileAmy(sceneDeclarationSource.replace("u8 Initial = Scenes.Menu", "on vblank MenuFrame\nu8 Initial = Scenes.Menu"));
  assert.equal(bad.ok, false);
  assert.match(bad.log, /scenes own the single on frame hook/i);
});
check("scene handlers reject parameters", () => {
  const bad = transpileAmy(sceneDeclarationSource.replace("sub GameFrame:", "sub GameFrame(u8 Value):"));
  assert.equal(bad.ok, false);
  assert.match(bad.log, /on frame target 'GameFrame' must not have parameters/i);
});
check("scene handlers reject cross-part overlay access", () => {
  const bad = transpileAmy(sceneDeclarationSource.replace("sub MenuFrame:\n  return", "sub MenuFrame:\n  SceneRam.Game.PlayerX = 9\n  return"));
  assert.equal(bad.ok, false);
  assert.match(bad.log, /belongs to scene 'menu'.*overlay part 'game'/i);
});
check("overlay-touching helpers reject ambiguous scene ownership", () => {
  const source = sceneDeclarationSource
    .replace("sub MenuFrame:\n  return", "sub MenuFrame:\n  SharedSceneHelper\n  return")
    .replace("sub GameFrame:\n  return", "sub GameFrame:\n  SharedSceneHelper\n  return\nend sub\nsub SharedSceneHelper:\n  SceneRam.Menu.Selection = 4\n  return");
  const bad = transpileAmy(source);
  assert.equal(bad.ok, false);
  assert.match(bad.log, /SharedSceneHelper.*reachable from .*menu.*game|SharedSceneHelper.*reachable from .*game.*menu/i);
});
check("shared helpers remain valid when they use only permanent RAM", () => {
  const source = sceneDeclarationSource
    .replace("u8 Initial = Scenes.Menu", "u8 SharedTicks = 0\nu8 Initial = Scenes.Menu")
    .replace("sub MenuFrame:\n  return", "sub MenuFrame:\n  SharedPermanentHelper\n  return")
    .replace("sub GameFrame:\n  return", "sub GameFrame:\n  SharedPermanentHelper\n  return\nend sub\nsub SharedPermanentHelper:\n  SharedTicks += 1\n  return");
  const good = transpileAmy(source);
  assert.equal(good.ok, true, good.log || "permanent-only shared helper should compile");
});

const computedArrayOperandResult = transpileAmy(`memory "colecovision_legacy_sdcc"
u8 Board[64]
u8 X = 1
u8 Y = 2
u8 Result = 0
if Board[(Y << 3) + X] = 0 then Result = 1
Result = IsEnemy(2, Board[(Y << 3) + X])
loop forever
function IsEnemy(u8 Side, u8 Cell) as u8
  return Cell
`);
check("computed array indexes work in comparisons and function arguments", () => {
  assert.equal(computedArrayOperandResult.ok, true, computedArrayOperandResult.log || "computed array operand transpile failed");
  const indexedLoads = computedArrayOperandResult.asmBody.match(/ld hl,(?:AMY_UVAR_Board|\$7020)\s*\n\s*add hl,de\s*\n\s*ld a,\(hl\)/gi) || [];
  assert.ok(indexedLoads.length >= 2, "comparison and function argument must each load the computed array element");
});

const qualifiedMutatorsResult = transpileAmy(`memory "colecovision_legacy_sdcc"
record Flags:
  u8 ByteValue
  u16 WordValue
end record

Flags Direct
overlay StateRam
  Menu as Flags
  Game as Flags
end overlay

Direct.ByteValue = $F3
Direct.ByteValue &= $0F
Direct.ByteValue |= $80
Direct.ByteValue <<= 2
Direct.ByteValue >>= 1
StateRam.Menu.WordValue = $1234
StateRam.Menu.WordValue <<= 2
StateRam.Menu.WordValue >>= 2
loop forever
`);
check("qualified record and overlay mutators compile", () => {
  assert.equal(qualifiedMutatorsResult.ok, true, qualifiedMutatorsResult.log || "qualified mutators transpile failed");
  assert.match(qualifiedMutatorsResult.asmBody, /and \$0F/i);
  assert.match(qualifiedMutatorsResult.asmBody, /or \$80/i);
  assert.match(qualifiedMutatorsResult.asmBody, /sla a/i);
  assert.match(qualifiedMutatorsResult.asmBody, /srl a/i);
  assert.match(qualifiedMutatorsResult.asmBody, /add hl,hl/i);
  assert.match(qualifiedMutatorsResult.asmBody, /srl h\s+rr l/i);
});

const incompleteBcdDeclaration = transpileAmy("bcd Score = 0\nloop forever\n");
check("incomplete BCD declaration has a typed diagnostic", () => {
  assert.equal(incompleteBcdDeclaration.ok, false);
  assert.match(incompleteBcdDeclaration.log, /BCD declarations require a size.*bcd digits N Name/i);
});

const wideArrayOutOfBounds = transpileAmy("u32 Values[4] = 0\nu32 Result = 0\nResult = Values[4]\nloop forever\n");
check("wide array constant indexes are bounds-checked", () => {
  assert.equal(wideArrayOutOfBounds.ok, false);
  assert.match(wideArrayOutOfBounds.log, /Invalid runtime assignment/i);
});

const wideArrayRuntimeLength = transpileAmy("u8 Count = 4\nu32 Values[Count] = 0\nloop forever\n");
check("wide array lengths remain compile-time constants", () => {
  assert.equal(wideArrayRuntimeLength.ok, false);
  assert.match(wideArrayRuntimeLength.log, /Array length must be a constant integer/i);
});

const fixedArrayElementStore = transpileAmy("fixed Values[4] = 1.5\nValues[1] = 1.5\nloop forever\n");
check("fixed array element stores compile", () => {
  assert.equal(fixedArrayElementStore.ok, true, fixedArrayElementStore.log || "fixed array element store transpile failed");
  assert.match(fixedArrayElementStore.asmBody, /ld hl,\$0180/i);
  assert.match(fixedArrayElementStore.asmBody, /ld hl,\$7022\s+pop de\s+ld \(hl\),e\s+inc hl\s+ld \(hl\),d/i);
});

const BIOS_STUBS = "TURN_OFF_SOUND EQU $1FD6\nMODE_1 EQU $1F85\n";
const qualifiedMutatorsAsm = BIOS_STUBS + qualifiedMutatorsResult.asmBody;
for (const profileName of ["off", "safe", "balanced", "aggressive", "experimental"]) {
  const profile = getOptimizationProfile(profileName, qualifiedMutatorsAsm);
  const binary = await assembleAmysCVAssembly(
    { "main.asm": qualifiedMutatorsAsm },
    "main.asm",
    {
      outputFilename: `qualified-mutators-${profileName}.bin`,
      outputMode: "binary",
      targetPlatform: "raw",
      optimizerEnabled: profile.optimizerEnabled,
      optimizerConfig: profile.optimizerConfig
    }
  );
  check(`qualified mutators assemble under ${profileName}`, () => {
    assert.equal(binary.ok, true, binary.log || `qualified mutator ${profileName} assembly failed`);
  });
}

const assembled = await assembleAmysCVAssembly({ "main.asm": BIOS_STUBS + asm }, "main.asm", {
  outputFilename: "ref-demo.bin",
  outputMode: "binary",
  targetPlatform: "raw",
  optimizerEnabled: false
});

check("ref demo assembles to raw binary", () => {
  assert.equal(assembled.ok, true, assembled.log || "assembly failed");
  const size = assembled.binary?.length ?? assembled.bytes?.length ?? 0;
  assert.ok(size > 0, "empty binary");
  console.log(`     ref demo code size: ${size} bytes (unoptimized, raw)`);
});

const balancedProfile = getOptimizationProfile("balanced", BIOS_STUBS + asm);
const optimized = await assembleAmysCVAssembly({ "main.asm": BIOS_STUBS + asm }, "main.asm", {
  outputFilename: "ref-demo-opt.bin",
  outputMode: "binary",
  targetPlatform: "raw",
  optimizerEnabled: balancedProfile.optimizerEnabled,
  optimizerConfig: balancedProfile.optimizerConfig
});

check("ref demo survives the balanced optimizer", () => {
  assert.equal(optimized.ok, true, optimized.log || "optimized assembly failed");
  const size = optimized.binary?.length ?? optimized.bytes?.length ?? 0;
  assert.ok(size > 0, "empty optimized binary");
  assert.match(String(optimized.listing || ""), /ld l,\(ix\+4\)/i, "pointer deref must survive optimization");
  console.log(`     ref demo code size: ${size} bytes (balanced optimizer)`);
});

if (failures.length) {
  console.error(`\n${failures.length} test(s) failed`);
  process.exit(1);
}
console.log("\nAll ref param codegen tests passed");

