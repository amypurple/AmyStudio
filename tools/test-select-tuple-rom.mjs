#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-select-tuple-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `project "SELECT TUPLE ROM"
memory "colecovision_legacy_sdcc"
u8 X = 2
u8 Y = 5
u8 A = 3
u8 B = 4
u8 Result = 0
u8 Guard = 99
sub start:
  select case (X, Y)
    case (1, 1)
      Result = 10
    case (2, 4 to 6)
      Result = 20
    case else
      Result = 30
  end select
  select case (A, B)
    case (1, 1), (3, 4)
      Result += 2
    case else
      Result = 50
  end select
  select case X
    case 1, 2
      Result += 1
    case else
      Result = 40
  end select
  loop forever
end sub
`;

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing RAM symbol ${symbol}`);
  return Number.parseInt(match[1], 16);
}

function compile(name, text, profile = "balanced") {
  const sourcePath = join(temp, `${name}.alexis`);
  const asmPath = join(temp, `${name}.asm`);
  const romPath = join(temp, `${name}.rom`);
  writeFileSync(sourcePath, text);
  const result = spawnSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return { result, asmPath, romPath };
}

try {
  const bios = readFileSync(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const built = compile(`tuple-${profile}`, source, profile);
    assert.equal(built.result.status, 0, `${profile}: ${built.result.error?.stack || ""}${built.result.stdout || ""}${built.result.stderr || ""}`);
    const asm = readFileSync(built.asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x5455504C });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(built.romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Result"), 1)[0], 23, `${profile}: tuple or scalar select result`);
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Guard"), 1)[0], 99, `${profile}: RAM guard`);
    } finally {
      core.destroy();
    }
  }
  for (const [name, replacement, message] of [
    ["missing-parens", "case 2, 5", /tuple.*require.*\(Value1, Value2/i],
    ["wrong-arity", "case (2)", /tuple case has 1 values but select has 2/i]
  ]) {
    const bad = compile(name, source.replace("case (2, 4 to 6)", replacement));
    assert.notEqual(bad.result.status, 0, `${name} unexpectedly compiled`);
    assert.match(`${bad.result.stdout}${bad.result.stderr}`, message, `${name}: diagnostic`);
  }
  console.log(`Tuple select ROM: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
