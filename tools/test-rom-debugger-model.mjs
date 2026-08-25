import assert from "node:assert/strict";
import {
  annotateOverlaySymbols,
  chooseAmySourceMarker,
  classifyAddress,
  decodeVdpRegisters,
  filterSymbols,
  findNearestSymbol,
  formatHexDump,
  inspectOverlaySymbolDebugState,
  listAmyDebugBreakpoints,
  listAmyProcedureSourceMarkers,
  listAmySourceMarkers,
  parseAmySymbols,
  resolveAmySourceBreakpoints,
  resolveSymbolOrAddress
} from "../studio/core/romDebuggerModel.js";

const symbols = parseAmySymbols(`
00:8000 ROM_BASE
00:8021 Nmi
AMY_UPROC_Main: equ $8123
AMY_ULBL_BREAK_game_loop: equ $8124
00:7000 AMY_BUFFER32
00:7023 AMY_UVAR_PlayerX
invalid line
`);

assert.deepEqual(symbols.map((entry) => entry.name), [
  "AMY_BUFFER32",
  "AMY_UVAR_PlayerX",
  "ROM_BASE",
  "Nmi",
  "AMY_UPROC_Main",
  "AMY_ULBL_BREAK_game_loop"
]);

const overlaySymbols = annotateOverlaySymbols(parseAmySymbols(`
AMY_SCENE_Menu_Selection: equ $7000
AMY_SCENE_Game_PlayerX: equ $7000
AMY_UVAR_Global: equ $7001
`), [{
  name: "ArcadeRam",
  debugPoison: 0xCD,
  parts: [
    { name: "Menu", fields: [{ asmName: "AMY_SCENE_Menu_Selection", qualifiedName: "ArcadeRam.Menu.Selection", type: "u8", width: 1, offset: 0, activeWhen: { symbol: "AMY_UVAR_ActiveScene", equals: 1 } }] },
    { name: "Game", fields: [{ asmName: "AMY_SCENE_Game_PlayerX", qualifiedName: "ArcadeRam.Game.PlayerX", type: "u8", width: 1, offset: 0 }] }
  ]
}]);
assert.equal(overlaySymbols[0].address, overlaySymbols[1].address);
assert.equal(overlaySymbols[0].overlay.debugPoison, 0xCD);
assert.equal(overlaySymbols[0].overlay.qualifiedName, "ArcadeRam.Game.PlayerX");
assert.equal(overlaySymbols[1].overlay.qualifiedName, "ArcadeRam.Menu.Selection");
assert.equal(overlaySymbols[2].overlay, undefined, "ordinary symbols must remain unannotated");
assert.equal(resolveSymbolOrAddress("ArcadeRam.Menu.Selection", overlaySymbols), 0x7000);
assert.equal(filterSymbols(overlaySymbols, "PlayerX").length, 1);
const poisonState = inspectOverlaySymbolDebugState(
  overlaySymbols[1],
  [...overlaySymbols, { name: "AMY_UVAR_ActiveScene", address: 0x7002 }],
  (address, length) => Uint8Array.from(address === 0x7002 ? [1] : Array(length).fill(0xCD))
);
assert.equal(poisonState.active, true);
assert.equal(poisonState.poisoned, true);
assert.equal(resolveSymbolOrAddress("Nmi", symbols), 0x8021);
const sourceMarkers = listAmySourceMarkers(parseAmySymbols(`
AMY_SOURCE_LINE_10: equ $8123
AMY_SOURCE_LINE_11: equ $8123
AMY_SOURCE_LINE_12: equ $8124
`));
const sourceResolution = resolveAmySourceBreakpoints([
  { line: 10, enabled: true },
  { line: 11, enabled: true, condition: "PlayerX > 4", valueType: "u8" },
  { line: 99, enabled: true }
], sourceMarkers);
assert.equal(sourceResolution.groups.length, 1);
assert.equal(sourceResolution.groups[0].address, 0x8123);
assert.deepEqual(sourceResolution.groups[0].members.map((entry) => entry.line), [10, 11]);
assert.deepEqual(sourceResolution.unresolved.map((entry) => entry.line), [99]);
assert.equal(
  chooseAmySourceMarker(sourceMarkers.filter((entry) => entry.address === 0x8123)).sourceLine,
  11,
  "shared optimized addresses should reveal the later executable Amy line"
);

assert.equal(
  chooseAmySourceMarker([
    { sourceLine: 337, instance: 1 },
    { sourceLine: 338, instance: 1 },
    { sourceLine: 421, instance: 1 }
  ]).sourceLine,
  338,
  "shared addresses must not jump to an unrelated later source block"
);
assert.equal(
  chooseAmySourceMarker([
    { sourceLine: 273, instance: 1 },
    { sourceLine: 337, instance: 1 },
    { sourceLine: 338, instance: 1 }
  ], {
    address: 0x9000,
    symbols: [{ address: 0x9000, name: "AMY_UPROC_ReversiCpuTurn" }],
    sourceText: `' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\n' filler\nsub ReversiCpuTurn:\n  nmi on\n  wait 1 frames\n`
  }).sourceLine,
  338,
  "a procedure entry should ignore aliases from another source routine"
);

assert.deepEqual(
  listAmyProcedureSourceMarkers(
    [{ address: 0x9000, name: "AMY_UPROC_ReversiCpuTurn" }],
    "sub ReversiCpuTurn:\n  nmi on\n  wait\n"
  ).map(({ address, sourceLine, procedureEntry }) => ({ address, sourceLine, procedureEntry })),
  [{ address: 0x9000, sourceLine: 2, procedureEntry: true }],
  "procedure symbols should provide an independent source-step stop"
);

assert.equal(resolveSymbolOrAddress("$7023", symbols), 0x7023);
assert.equal(resolveSymbolOrAddress("0x8000", symbols), 0x8000);
assert.equal(findNearestSymbol(0x8024, symbols), "Nmi+$03");
assert.equal(classifyAddress(0x7023), "RAM");
assert.equal(classifyAddress(0x8123), "ROM");
assert.equal(filterSymbols(symbols, "player").length, 1);
assert.deepEqual(listAmyDebugBreakpoints(symbols).map((entry) => entry.label), ["game_loop"]);

assert.equal(
  formatHexDump(Uint8Array.from([0x41, 0x00, 0x7F]), 0x7000),
  "$7000  41 00 7F                                         |A..             |"
);

const vdp = decodeVdpRegisters(Uint8Array.from([
  0x02,
  0xE2,
  0x06,
  0x80,
  0x00,
  0x36,
  0x07,
  0xF5
]));
assert.equal(vdp.mode, "Graphics II");
assert.equal(vdp.displayEnabled, true);
assert.equal(vdp.nmiEnabled, true);
assert.equal(vdp.sprites16, true);
assert.equal(vdp.nameTable, 0x1800);
assert.equal(vdp.spriteAttributeTable, 0x1B00);
assert.equal(vdp.spritePatternTable, 0x3800);
assert.equal(vdp.backdrop, 5);

console.log("ROM debugger model: PASS");
