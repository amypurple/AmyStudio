import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkTypedPrintFormatDeprecation } from "../studio/core/compiler/deprecations.js";

const removed = [
  ["print i8 Delta at 1,2 digits 4", "print Delta at 1,2 digits 4"],
  ["print bcd Score at 1,2 tiles $40", "print Score at 1,2 tiles $40"],
  ["format fixed Speed into Text", "format Speed into Text"],
  ["format u32 Counter into Text", "format Counter into Text"]
];

for (const [source, replacement] of removed) {
  const result = checkTypedPrintFormatDeprecation(source, source);
  assert.equal(result.handled, true, `${source} must be recognized as removed`);
  assert.equal(result.ok, false, `${source} must fail closed`);
  assert.ok(result.log.includes(`use '${replacement}'`), `${source} must suggest ${replacement}`);
}

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-bcd-print-tiles-"));
try {
  const source = join(temp, "bcd-print-tiles.alexis");
  writeFileSync(source, `bcd digits 4 Score = 1234
text screen
print Score at 1,2 tiles $40
loop forever
`, "utf8");
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const asm = join(temp, `${profile}.asm`);
    const rom = join(temp, `${profile}.rom`);
    const result = spawnSync(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, `${profile}: ${result.stdout}${result.stderr}`);
    const listing = readFileSync(asm, "utf8");
    assert.match(listing, /add a,\$40/i, `${profile}: BCD tile offset`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log("Typed print/format removal and BCD tile offset PASS (5 profiles).");
