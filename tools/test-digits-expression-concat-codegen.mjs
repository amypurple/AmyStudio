#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { transpileAmyForTest } from "./lib/transpile-amy-test.mjs";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const sourceText = `
u8 Lv = 4
text screen
print at 2,5, "L " + digits$(Lv + 1, 2)
print at 2,6, digits$(Lv + 1, 2)
print at 2,7, "L " + digits$(Lv, 2)
loop forever
`;

for (const profile of profiles) {
  const result = transpileAmyForTest(sourceText, { optimizationLevel: profile });
  assert.equal(result.ok, true, `${profile}: ${result.log || "transpile failed"}`);
  assert.match(result.asmBody, /call AMY_U16_TO_ASCII5/i, `${profile}: expression formatting helper`);
  assert.doesNotMatch(result.log || "", /print at requires byte-sized coordinates/i);
}

const unsupported = transpileAmyForTest(`
u8 Lv = 4
text screen
print at 2,5, "L " + digits$(Lv + 1, Lv)
`);
assert.equal(unsupported.ok, false);
assert.match(unsupported.log, /field width must be a literal integer from 1 to 16/i);

const temp = mkdtempSync(join(tmpdir(), "amy-digits-expr-concat-"));
try {
  const sourcePath = join(temp, "digits-expression-concat.alexis");
  const bios = readFileSync(join(root, "studio", "bios", "colecovision.rom"));
  writeFileSync(sourcePath, sourceText);
  for (const profile of profiles) {
    const romPath = join(temp, `${profile}.rom`);
    const build = spawnSync(process.execPath, ["tools/amyc.mjs", sourcePath, "--rom", romPath, "--opt", profile], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(build.status, 0, `${profile}: ${build.error?.stack || ""}${build.stdout || ""}${build.stderr || ""}`);
    const core = await GearcolecoTestCore.create({ seed: 0xD16175 });
    try {
      core.loadBios(bios);
      core.loadRom(readFileSync(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 45; frame += 1) core.runFrame();
      const row = (y) => String.fromCharCode(...core.readVram(0x1800 + y * 32 + 2, 4));
      assert.equal(row(5), "L 05", `${profile}: concatenated digits$ expression`);
      assert.equal(row(6).slice(0, 2), "05", `${profile}: direct digits$ expression`);
      assert.equal(row(7), "L 04", `${profile}: concatenated digits$ variable`);
    } finally {
      core.destroy();
    }
  }
  console.log(`digits$ expression concatenation: PASS (${profiles.length} profiles, ROM + VRAM)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
