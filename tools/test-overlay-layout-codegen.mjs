#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-overlay-layout-"));

function compile(name, body, expectSuccess = true, optimization = "balanced") {
  const source = join(temp, `${name}-${optimization}.alexis`);
  const asm = join(temp, `${name}-${optimization}.asm`);
  writeFileSync(source, `project "${name}"\nmemory "colecovision_legacy_sdcc"\n${body}\n`);
  const result = spawnSync(process.execPath, [amyc, source, "--asm", asm, "--opt", optimization], {
    cwd: root,
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}${result.stderr || ""}${result.error ? `\n${result.error.stack || result.error}` : ""}`;
  if (expectSuccess) {
    assert.equal(result.status, 0, `${name} should compile:\n${output}`);
    return { asm: readFileSync(asm, "utf8"), output };
  }
  assert.notEqual(result.status, 0, `${name} should be rejected`);
  return { asm: "", output };
}

function equAddress(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-F]{4})$`, "mi"));
  assert.ok(match, `missing ${symbol}`);
  return Number.parseInt(match[1], 16);
}

const valid = `
record Position:
  u8 X
  u8 Y
end record
record MenuMemory:
  u8 Selection
  u8 Blink
end record
record GameMemory:
  Position Player
  u8 EnemyX[8]
  u16 Scores[3]
end record
overlay SceneRam
  Menu as MenuMemory
  Game as GameMemory
end overlay
u8 Permanent = 7
SceneRam.Menu.Selection = Permanent
SceneRam.Game.Player.X = 12
SceneRam.Game.EnemyX[3] = 21
SceneRam.Game.Scores[2] = 1234
`;

try {
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const { asm, output } = compile("overlay-valid", valid, true, profile);
    const base = equAddress(asm, "AMY_OVERLAY_SceneRam");
    assert.equal(equAddress(asm, "AMY_SCENE_Menu_Selection"), base);
    assert.equal(equAddress(asm, "AMY_SCENE_Game_Player_X"), base);
    assert.equal(equAddress(asm, "AMY_SCENE_Game_EnemyX"), base + 2);
    assert.equal(equAddress(asm, "AMY_SCENE_Game_Scores"), base + 10);
    assert.equal(equAddress(asm, "AMY_UVAR_Permanent"), base + 16);
    assert.match(asm, new RegExp(`ld \\(\\$${base.toString(16).toUpperCase().padStart(4, "0")}\\),a`, "i"));
    assert.match(output, /RAM\s+17 physical bytes; overlays save 2 bytes \(18 logical in 16 physical\)/);
  }

  const equal = compile("overlay-equal", `
record A: 
  u16 Word
end record
record B:
  u8 Bytes[2]
end record
overlay Shared
  First as A
  Second as B
end overlay
Shared.First.Word = 1
Shared.Second.Bytes[1] = 2
`).output;
  assert.match(equal, /overlays save 2 bytes \(4 logical in 2 physical\)/);

  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const nestedArray = compile("overlay-record-array-field", `
record Actor:
  u8 X
  u16 Score
  i8 DX
  u8 Flags[3]
end record
record GameMemory:
  u8 Prefix
  Actor Items[3]
  u8 After
end record
record OtherMemory:
  u8 Bytes[23]
end record
overlay Shared
  Game as GameMemory
  Other as OtherMemory
end overlay
u8 I = 1
Shared.Game.Items[0].Score = 1000
Shared.Game.Items[1].X = 17
Shared.Game.Items[2].DX = -3
Shared.Game.Items[I].X = 29
Shared.Game.After = 99
`, true, profile);
    const base = equAddress(nestedArray.asm, "AMY_OVERLAY_Shared");
    assert.equal(equAddress(nestedArray.asm, "AMY_SCENE_Game_Items"), base + 1);
    assert.equal(equAddress(nestedArray.asm, "AMY_SCENE_Game_After"), base + 22);
    assert.match(nestedArray.asm, new RegExp(`ld \\(\\$${(base + 8).toString(16).toUpperCase().padStart(4, "0")}\\),a`, "i"));
    assert.match(nestedArray.asm, new RegExp(`ld \\(\\$${(base + 18).toString(16).toUpperCase().padStart(4, "0")}\\),a`, "i"));
  }

  assert.match(compile("overlay-unknown-type", `
record A:
  u8 X
end record
overlay Shared
  First as A
  Second as Missing
end overlay
`, false).output, /requires a previously defined record type/i);

  assert.match(compile("overlay-duplicate-part", `
record A:
  u8 X
end record
overlay Shared
  First as A
  first as A
end overlay
`, false).output, /duplicate overlay part/i);

  assert.match(compile("overlay-one-part", `
record A:
  u8 X
end record
overlay Shared
  First as A
end overlay
`, false).output, /requires at least two/i);

  assert.match(compile("overlay-multiple-groups", `
record A:
  u8 X
end record
overlay SharedA
  First as A
  Second as A
end overlay
overlay SharedB
  First as A
  Second as A
end overlay
`, false).output, /supports one overlay group/i);

  const invalidWordField = compile("overlay-invalid-word-field", `
record A:
  u16 Word
end record
overlay Shared
  First as A
  Second as A
end overlay
u16 Result = 0
Result = Shared.First.Missing + 1
`, false).output;
  assert.doesNotMatch(invalidWordField, /Invalid expression.*ld HL/i);
  assert.match(invalidWordField, /cannot compile|unsupported|invalid|unknown/i);

  const lateMemorySource = join(temp, "overlay-late-memory.alexis");
  writeFileSync(lateMemorySource, `project "late memory"
record A:
  u8 X
end record
overlay Shared
  First as A
  Second as A
end overlay
memory "colecovision_legacy_sdcc"
`);
  const lateMemory = spawnSync(process.execPath, [amyc, lateMemorySource, "--opt", "balanced"], { cwd: root, encoding: "utf8" });
  assert.notEqual(lateMemory.status, 0, "memory after overlay must be rejected");
  assert.match(`${lateMemory.stdout || ""}${lateMemory.stderr || ""}`, /memory must be declared before overlay/i);

  console.log("Amy overlay layout: PASS (record-backed aliases, physical/logical RAM, nested/array fields, five optimizer profiles)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
