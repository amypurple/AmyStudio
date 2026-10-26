#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = mkdtempSync(join(tmpdir(), "amy-address-of-"));

function compile(id, body, profile = "balanced") {
  const source = join(output, `${id}.alexis`);
  const asm = join(output, `${id}.asm`);
  const rom = join(output, `${id}.rom`);
  writeFileSync(source, `cartridge "ADDRESS OF TEST/AMY/2026"\n${body}\n`);
  const result = spawnSync(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  return { ...result, asm: result.status === 0 ? readFileSync(asm, "utf8") : "" };
}

try {
  const validBody = `
u16 SourceAddress = 0
u16 ArrayAddress = 0
u8 Buffer[4]
SourceAddress = address of TilePat
ArrayAddress = address of Buffer
data TilePat bytes = 1,2,3,4
`;
  for (const profile of ["off", "safe", "balanced", "aggressive", "experimental"]) {
    const valid = compile(`valid-${profile}`, validBody, profile);
    assert.equal(valid.status, 0, `${profile}: ${valid.error?.stack || valid.stderr || valid.stdout}`);
    assert.match(valid.asm, /ld hl,AMY_UDATA_TilePat[\s\S]*ld \(AMY_UVAR_SourceAddress\),hl/);
    assert.match(valid.asm, /ld hl,AMY_UVAR_Buffer[\s\S]*ld \(AMY_UVAR_ArrayAddress\),hl/);
    assert.doesNotMatch(valid.asm, /ld hl,\s*address\s+of/i);
  }

  for (const [id, declaration] of [["byte", "u8"], ["signed", "i16"], ["fixed", "ufixed"]]) {
    const invalid = compile(id, `${declaration} Destination = 0\nDestination = address of TilePat\ndata TilePat bytes = 1`);
    assert.notEqual(invalid.status, 0, `${id} address destination must be rejected`);
    assert.match(`${invalid.stdout}\n${invalid.stderr}`, /Invalid runtime assignment/);
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}

console.log("address-of assignment codegen: PASS (5 profiles)");
