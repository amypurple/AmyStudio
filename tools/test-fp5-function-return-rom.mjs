#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const expected = [0x00, 0x00, 0x00, 0x40, 0x81]; // Amy fp5 encoding of 1.5.
const temp = await mkdtemp(join(tmpdir(), "amy-fp5-return-"));

function compile(source, asm, rom, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      stdio: "ignore"
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`compile failed: ${profile}`)));
  });
}

function addressOf(asm, symbol) {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
}

try {
  const source = join(temp, "fp5-return.alexis");
  await writeFile(source, `project "FP5 FUNCTION RETURN ROM"
memory "colecovision_legacy_sdcc"
fp5 GlobalResult = 0
fp5 LocalResult = 0
GlobalResult = InlineValue()
StoreLocal
loop forever

function MakeValue() as fp5
  fp5 Value = 1.5
  return Value

function RelayValue() as fp5
  return MakeValue()

function InlineValue() as fp5
  if 1 = 1 then return RelayValue()
  return 0

sub StoreLocal
  fp5 Value = 0
  Value = MakeValue()
  LocalResult = Value
end sub
`);
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `fp5-${profile}.asm`);
    const romPath = join(temp, `fp5-${profile}.rom`);
    await compile(source, asmPath, romPath, profile);
    const [asm, rom] = await Promise.all([readFile(asmPath, "utf8"), readFile(romPath)]);
    assert.match(asm, /^AMY_FP5_RET\s+EQU\s+\$[0-9A-F]{4}$/m, `${profile}: return cell missing`);
    const core = await GearcolecoTestCore.create({ seed: 0x46503552 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 4; frame += 1) core.runFrame();
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_UVAR_GlobalResult"), 5)], expected, `${profile}: global result`);
      assert.deepEqual([...core.readRam(addressOf(asm, "AMY_UVAR_LocalResult"), 5)], expected, `${profile}: local result`);
    } finally {
      core.destroy();
    }
  }
  const noReturnSource = join(temp, "fp5-no-return.alexis");
  const noReturnAsm = join(temp, "fp5-no-return.asm");
  const noReturnRom = join(temp, "fp5-no-return.rom");
  await writeFile(noReturnSource, `project "FP5 NO RETURN CELL"\nfp5 Value = 1.5\nloop forever\n`);
  await compile(noReturnSource, noReturnAsm, noReturnRom, "balanced");
  assert.doesNotMatch(await readFile(noReturnAsm, "utf8"), /AMY_FP5_RET/, "unused fp5 return cell must not consume RAM");
  console.log(`fp5 function return ROM: PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
