#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-data-table-runtime-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `u8 Index = 1
u16 Address = 0
u8 Value = 0

screen off
copy Repeated count 768 to vram.name
Address = Tables[Index]
Value = peek(Address)
vpoke vram.name, Value
Address += 1
Value = peek(Address)
vpoke vram.name + 1, Value
loop forever

data First bytes = $11,$22
data Second bytes = $A5,$5A
data Tables words = @First,@Second
data Repeated bytes
  $20 count 768
end data
`;

try {
  const bios = readFileSync(process.env.AMY_COLECO_BIOS || resolve(root, "studio/bios/colecovision.rom"));
  const sourcePath = join(temp, "data-table-runtime.alexis");
  writeFileSync(sourcePath, source);
  for (const profile of profiles) {
    const romPath = join(temp, `data-table-${profile}.rom`);
    const result = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), sourcePath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${profile}: ${result.error?.stack || ""}${result.stdout || ""}${result.stderr || ""}`);

    const core = await GearcolecoTestCore.create({ seed: 0x44415441 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 90; frame += 1) core.runFrame();
      const nameBase = (core.getVdpRegisters()[2] & 0x0F) << 10;
      const nameTable = [...core.readVram(nameBase, 768)];
      assert.deepEqual(nameTable.slice(0, 2), [0xA5, 0x5A], `${profile}: indexed WORD table selected the wrong payload`);
      assert.ok(nameTable.slice(2).every((value) => value === 0x20), `${profile}: repeated DATA did not fill all 768 bytes`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Data/WORD table runtime: PASS (${profiles.length} profiles)`);
} finally {
  if (process.env.AMY_KEEP_TEST_TEMP) console.log(`Kept test files: ${temp}`);
  else rmSync(temp, { recursive: true, force: true });
}
