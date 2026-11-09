#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-copy-const-offset-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const bytes = Array.from({ length: 800 }, (_, index) => index & 0xFF);
const source = `
const Off = 456
data Big bytes = ${bytes.join(",")}
  mode 2 screen
  copy Big + Off count 8 to vram.pattern + 1024
Done:
  goto Done
`;

try {
  const sourcePath = join(temp, "copy-offset.alexis");
  const bios = readFileSync(join(root, "studio/bios/colecovision.rom"));
  writeFileSync(sourcePath, source);
  for (const profile of profiles) {
    const asmPath = join(temp, `copy-offset-${profile}.asm`);
    const romPath = join(temp, `copy-offset-${profile}.rom`);
    const build = spawnSync(process.execPath, [join(root, "tools/amyc.mjs"), sourcePath,
      "--asm", asmPath, "--rom", romPath, "--opt", profile], { cwd: root, encoding: "utf8" });
    assert.equal(build.status, 0, `${profile}: ${build.stdout || ""}${build.stderr || ""}`);
    const asm = readFileSync(asmPath, "utf8");
    assert.doesNotMatch(asm, /ld a,AMY_UCONST_Off/i, `${profile}: named offset must not use an 8-bit load`);
    assert.match(asm, /ld hl,AMY_UDATA_Big \+ AMY_UCONST_Off/i,
      `${profile}: named offset must remain a 16-bit address expression`);

    const core = await GearcolecoTestCore.create({ seed: 0x434f5059 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 12; frame += 1) core.runFrame();
      assert.deepEqual([...core.readVram(0x0400, 8)], bytes.slice(456, 464), `${profile}: VRAM payload`);
    } finally {
      core.destroy();
    }
  }
  console.log(`Named constant copy offset: PASS (${profiles.length} profiles)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
