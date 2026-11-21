#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-case-collision-"));
try {
  const source = join(temp, "collision.alexis");
  writeFileSync(source, "u8 TBX = 0\nu8 TBx = 1\nloop forever\n");
  const result = spawnSync(process.execPath, ["tools/amyc.mjs", source, "--opt", "balanced"], {
    cwd: root, encoding: "utf8",
  });
  assert.notEqual(result.status, 0, "case-insensitive duplicate compiled");
  assert.match(
    `${result.stdout}${result.stderr}`,
    /'TBx'.*variable 'TBX'.*names are case-insensitive/i,
    "diagnostic did not identify both spellings and the case-insensitive rule",
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log("Case-insensitive collision diagnostic PASS.");
