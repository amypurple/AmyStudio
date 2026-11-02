#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(repo, "tools", "amyc.mjs");
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: repo, encoding: "utf8" });

const help = run("--help");
assert.equal(help.status, 0, help.stderr);
for (const text of ["--output", "experimental", "adam-native-program", "colecovision_legacy_sdcc", "microinnovations-serial"]) {
  assert.match(help.stdout, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

for (const args of [
  ["--unknown"],
  ["fake.alexis", "--opt", "fast"],
  ["fake.alexis", "--target", "nes"],
  ["fake.alexis", "--hardware", "mystery"],
  ["fake.alexis", "--medium", "dsk"],
  ["fake.alexis", "--report-json"]
]) {
  const result = run(...args);
  assert.equal(result.status, 2, `${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
}

const dir = mkdtempSync(path.join(tmpdir(), "amy-cli-"));
try {
  const source = path.join(dir, "hello.alexis");
  writeFileSync(source, 'cartridge "CLI TEST/AMY/2026"\ntext screen\nprint at 10,10, "HELLO"\n', "utf8");
  const result = run(source, "--output", path.join(dir, "nested", "hello.rom"), "--asm", path.join(dir, "nested", "hello.asm"), "--symbols", path.join(dir, "nested", "hello.sym"), "--report-json", path.join(dir, "nested", "hello.json"));
  assert.equal(result.status, 0, result.stderr || result.stdout);
  for (const file of ["hello.rom", "hello.asm", "hello.sym", "hello.json"]) assert.ok(existsSync(path.join(dir, "nested", file)), file);
  assert.equal(JSON.parse(readFileSync(path.join(dir, "nested", "hello.json"), "utf8")).ok, true);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("amyc CLI help, validation and output paths: PASS");
