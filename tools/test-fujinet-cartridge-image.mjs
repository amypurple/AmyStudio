#!/usr/bin/env node
// A FujiNet cartridge image is exactly 32 KiB: the program below $F800, $FF
// filler, and the "FUJI" claim at $FCFC that keeps the cartridge mailbox live.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "amy-fujinet-image-"));
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

function build(name, source, args) {
  const sourcePath = join(temp, `${name}.alexis`);
  const romPath = join(temp, `${name}.rom`);
  writeFileSync(sourcePath, source);
  const result = spawnSync(process.execPath, [join(root, "tools", "amyc.mjs"), sourcePath, "--rom", romPath, ...args], {
    cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024
  });
  return { ...result, rom: result.status === 0 ? readFileSync(romPath) : null };
}

try {
  const plainSource = "u8 Ticks = 0\nprint at 1,1,\"HELLO\"\nloop forever\n";
  for (const profile of profiles) {
    const plain = build(`plain-${profile}`, plainSource, ["--opt", profile]);
    const fujinet = build(`fujinet-${profile}`, plainSource, ["--opt", profile, "--hardware", "fujinet"]);
    assert.equal(plain.status, 0, plain.stdout + plain.stderr);
    assert.equal(fujinet.status, 0, fujinet.stdout + fujinet.stderr);
    const rom = fujinet.rom;
    assert.equal(rom.length, 32768, `${profile}: image size`);
    assert.ok(plain.rom.length < 0x7800, `${profile}: plain ROM stays unpadded`);
    assert.deepEqual(rom.subarray(0, plain.rom.length), plain.rom, `${profile}: program bytes unchanged by the FujiNet image`);
    assert.equal(rom.subarray(0x7CFC, 0x7D00).toString("latin1"), "FUJI", `${profile}: claim at $FCFC`);
    const filler = [...rom.subarray(plain.rom.length, 0x7CFC), ...rom.subarray(0x7D00)];
    assert.ok(filler.every((value) => value === 0xFF), `${profile}: $FF filler`);
    // The cartridge paints "FN" at $FC09 itself; the image must not, or an
    // emulator without a FujiNet would report one.
    assert.notEqual(rom.subarray(0x7C09, 0x7C0B).toString("latin1"), "FN");
  }

  // A program reaching $F800 fails with the mailbox named.
  const big = Array.from({ length: 31 }, (_, index) => `data Block${index} bytes ${Array(1000).fill(index & 0xFF).join(",")}`).join("\n");
  const oversized = build("oversized", `${big}\nloop forever\n`, ["--opt", "balanced", "--hardware", "fujinet"]);
  assert.notEqual(oversized.status, 0, "an oversized FujiNet program must fail");
  assert.match(oversized.stdout + oversized.stderr, /bytes over\): a FujiNet cartridge program must end below the mailbox at \$F800/);

  console.log(`FujiNet cartridge image: PASS (${profiles.length} profiles: 32 KiB, FUJI claim, $FF filler, program bytes unchanged; overflow named)`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
