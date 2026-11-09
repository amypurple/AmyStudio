#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amy-choose-menu-sleep-"));
const source = path.join(temp, "menu.alexis");
const asm = path.join(temp, "menu.asm");
const rom = path.join(temp, "menu.rom");

try {
  fs.writeFileSync(source, `u8 Choice = 1\ntext screen\nprint at 4,5, "ONE"\nprint at 4,6, "TWO"\nscreen on\nchoose menu 1 to 2 into Choice cursor $3E at 2,5 step 1 on joypad 1 sleep after 10 seconds\n`);
  const result = spawnSync(process.execPath, [path.join(root, "tools", "amyc.mjs"), source, "--asm", asm, "--rom", rom, "--opt", "balanced"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const generated = fs.readFileSync(asm, "utf8");
  for (const symbol of ["JOYPAD_1", "KEYPAD_1", "JOYPAD_2", "KEYPAD_2"]) {
    assert.match(generated, new RegExp(`^${symbol}\\s+EQU`, "m"), `missing ${symbol}`);
  }
  assert.match(generated, /call AMY_SLEEP_SERVICE/);
  const sleepAddress = generated.match(/^AMY_SLEEP_IDLE_TICKS\s+EQU\s+\$([0-9A-F]+)$/m);
  const choiceAddress = generated.match(/^AMY_UVAR_Choice\s+EQU\s+\$([0-9A-F]+)$/m);
  assert.ok(sleepAddress && choiceAddress, "missing sleep or user-variable address");
  assert.ok(
    Number.parseInt(choiceAddress[1], 16) >= Number.parseInt(sleepAddress[1], 16) + 2,
    "menu sleep counter overlaps user RAM"
  );
  console.log("choose menu sleep linkage PASS");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
