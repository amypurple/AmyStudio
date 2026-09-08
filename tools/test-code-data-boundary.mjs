import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-code-data-boundary-"));
const addressOf = (asm, symbol) => {
  const match = asm.match(new RegExp(`^${symbol}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert.ok(match, `missing address for ${symbol}`);
  return Number.parseInt(match[1], 16);
};
const source = [
  'project "Code Data Boundary"',
  'memory "colecovision_legacy_sdcc"',
  "u8 Passed = 0",
  "sub start:",
  "  IncludedWorker",
  "  InlineWorker",
  "  InlineCodeWorker",
  "  loop forever",
  "end sub",
  "sub InlineCodeWorker:",
  "  asm {",
  "    di",
  "    ei",
  "  }",
  "  Passed += 4",
  "  return",
  "end sub",
  "sub IncludedWorker:",
  "  Passed += 1",
  '  include "@project/boundary-data.asm"',
  "end sub",
  "sub InlineWorker:",
  "  Passed += 2",
  "  asm {",
  "BoundaryInlineData:",
  "    db $C3,$00,$00",
  "  }",
  "end sub",
  ""
].join("\n");

try {
  const sourcePath = path.join(temp, "boundary.alexis");
  fs.writeFileSync(sourcePath, source);
  fs.writeFileSync(path.join(temp, "boundary-data.asm"), "BoundaryIncludedData:\n    db $C3,$00,$00\n");

  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const romPath = path.join(temp, `boundary-${profile}.rom`);
    const asmPath = path.join(temp, `boundary-${profile}.asm`);
    execFileSync(process.execPath, [
      "tools/amyc.mjs", sourcePath, "--rom", romPath, "--asm", asmPath,
      "--opt", profile, "--project-dir", temp
    ], { cwd: root, stdio: "pipe" });

    const asm = fs.readFileSync(asmPath, "utf8");
    const includeAt = asm.indexOf('include "@project/boundary-data.asm"');
    const inlineAt = asm.indexOf("BoundaryInlineData:");
    const inlineCodeAt = asm.search(/^\s*di\s*$/m);
    const startSinkAt = asm.indexOf("AMY_START_FOREVER:");
    assert.ok(includeAt > startSinkAt, `${profile}: include must be emitted after executable code`);
    assert.ok(inlineAt > startSinkAt, `${profile}: detached inline ASM data must be emitted after executable code`);
    assert.ok(inlineCodeAt > 0, `${profile}: executable inline ASM must remain present`);

    const core = await GearcolecoTestCore.create({ seed: 0x434F4445 });
    try {
      core.loadBios(fs.readFileSync(path.join(root, "studio/bios/colecovision.rom")));
      core.loadRom(fs.readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 8; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "AMY_UVAR_Passed"), 1)[0], 7, `${profile}: routines must return without executing data bytes`);
    } finally {
      core.destroy();
    }

    const implicitSourcePath = path.join(temp, `implicit-${profile}.alexis`);
    const implicitRomPath = path.join(temp, `implicit-${profile}.rom`);
    const implicitAsmPath = path.join(temp, `implicit-${profile}.asm`);
    fs.writeFileSync(implicitSourcePath, [
      'project "Implicit Code Data Boundary"',
      'memory "colecovision_legacy_sdcc"',
      "u8 Passed = 0",
      "Passed = 1",
      'include "@project/boundary-data.asm"',
      "Passed += 2",
      "loop forever",
      ""
    ].join("\n"));
    execFileSync(process.execPath, [
      "tools/amyc.mjs", implicitSourcePath, "--rom", implicitRomPath, "--asm", implicitAsmPath,
      "--opt", profile, "--project-dir", temp
    ], { cwd: root, stdio: "pipe" });
    const implicitAsm = fs.readFileSync(implicitAsmPath, "utf8");
    assert.equal((implicitAsm.match(/^Start:$/gm) || []).length, 1, `${profile}: implicit source must emit exactly one Start label`);
    assert.ok(implicitAsm.indexOf('include "@project/boundary-data.asm"') > implicitAsm.indexOf("AMY_START_FOREVER:"), `${profile}: implicit include must follow the Start sink`);
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("Code/data boundary tests passed.");
