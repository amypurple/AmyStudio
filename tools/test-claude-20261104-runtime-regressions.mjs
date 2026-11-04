#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = mkdtempSync(join(tmpdir(), "amy-claude-20261104-"));
const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));

function build(source, profile, stem) {
  const sourcePath = join(temp, `${stem}.alexis`);
  const asmPath = join(temp, `${stem}-${profile}.asm`);
  const romPath = join(temp, `${stem}-${profile}.rom`);
  writeFileSync(sourcePath, source);
  const result = spawnSync(process.execPath, [
    "tools/amyc.mjs", sourcePath, "--asm", asmPath, "--rom", romPath, "--opt", profile
  ], { cwd: root, encoding: "utf8" });
  return { result, asmPath, romPath };
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-F]+)`, "im"));
  assert.ok(match, `missing RAM address for ${name}`);
  return Number.parseInt(match[1], 16);
}

const collisionSource = `cartridge "PARAM COLLISION/AMY/2026"
const GX = 5
u8 R = 0
function Twice(u8 Gx) as u8
  return Gx * 2
  R = Twice(20)
  loop forever
`;

const ixSource = `cartridge "IX FRAME/AMY/2026"
u8 G1 = 0
u8 G2 = 0
  tile screen
  screen on
  Probe
  loop forever
sub Probe:
  u8 Pg = 0
  Pg = 7
  G1 = Pg
  tile screen
  G2 = Pg
  return
end sub
asm {
Opaque:
    jp (hl)
}
`;

const constantIndexSource = `cartridge "CONST INDEX/AMY/2026"
const Two = 2
u8 Fl[8]
  Fl[Two] = 0
  Fl[Two + 1] = 1
  loop forever
`;

try {
  for (const profile of profiles) {
    const collision = build(collisionSource, profile, `collision-${profile}`);
    assert.notEqual(collision.result.status, 0, `${profile}: case-insensitive parameter/constant collision compiled`);
    assert.match(
      `${collision.result.error?.stack || ""}${collision.result.stdout || ""}${collision.result.stderr || ""}`,
      /Parameter name 'Gx'.*collides with an existing symbol/i,
      `${profile}: collision diagnostic did not name the parameter`
    );

    const constantIndex = build(constantIndexSource, profile, `constant-index-${profile}`);
    assert.equal(constantIndex.result.status, 0, `${profile}: named constant index did not compile`);
    const constantIndexAsm = readFileSync(constantIndex.asmPath, "utf8");
    const base = addressOf(constantIndexAsm, "Fl");
    assert.match(constantIndexAsm, new RegExp(`ld hl,\\$${(base + 2).toString(16).toUpperCase()}`, "i"), `${profile}: named index not folded`);
    assert.match(constantIndexAsm, new RegExp(`ld hl,\\$${(base + 3).toString(16).toUpperCase()}`, "i"), `${profile}: constant index expression not folded`);
    assert.doesNotMatch(constantIndexAsm, /ld a,AMY_UCONST_Two/i, `${profile}: named index used dynamic addressing`);

    const ix = build(ixSource, profile, `ix-${profile}`);
    assert.equal(ix.result.status, 0, `${profile}: ${ix.result.stdout || ""}${ix.result.stderr || ""}`);
    const asm = readFileSync(ix.asmPath, "utf8");
    const core = await GearcolecoTestCore.create({ seed: 0x49584652 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(ix.romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 1000; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "G1"), 1)[0], 7, `${profile}: pre-call local read`);
      assert.equal(core.readRam(addressOf(asm, "G2"), 1)[0], 7, `${profile}: tile screen destroyed IX frame`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Claude 2026-11-04 runtime regressions: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
