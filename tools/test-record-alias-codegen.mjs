#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const amyc = join(root, "tools", "amyc.mjs");
const temp = mkdtempSync(join(tmpdir(), "amy-record-alias-"));

function compile(name, body, expectSuccess = true) {
  const source = join(temp, `${name}.alexis`);
  const asm = join(temp, `${name}.asm`);
  writeFileSync(source, `project "${name}"\nmemory "colecovision_legacy_sdcc"\n${body}\n`);
  const result = spawnSync(process.execPath, [amyc, source, "--asm", asm, "--opt", "balanced"], {
    cwd: root,
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (expectSuccess) {
    assert.equal(result.status, 0, `${name} should compile:\n${output}`);
    return readFileSync(asm, "utf8");
  }
  assert.notEqual(result.status, 0, `${name} should be rejected`);
  return output;
}

const declarations = `
record Actor:
  u8 X
  u8 Y
end record
Actor Actors[2]
u8 I = 0
`;

try {
  const valid = compile("record-alias-valid", `${declarations}
sub ApplyAlias:
  with Actors[I] as Actor
    Actor.X = 7
    if I = 0 then return
    Actor.Y = 8
  end with
  return
end sub
ApplyAlias
loop forever`);
  assert.doesNotMatch(valid, /AMY_RUNTIME_INIT_INSERT/, "internal marker leaked into ASM");
  assert.match(valid, /ld \(\$[0-9A-F]{4}\),hl[\s\S]*ld hl,\(\$[0-9A-F]{4}\)/i, "alias pointer was not stored and reused");
  const scaled = compile("record-alias-scale-13", `
record WideActor:
  u8 A
  u8 B
  u8 C
  u8 D
  u8 E
  u8 F
  u8 G
  u8 H
  u8 I
  u8 J
  u8 K
  u8 L
  u8 M
end record
WideActor WideActors[4]
u8 WideIndex = 3
sub ScaleAlias:
  with WideActors[WideIndex] as Wide
    Wide.M = 9
  end with
  return
end sub
ScaleAlias
loop forever`);
  assert.match(scaled, /ld e,a\s+ld d,0\s+ld l,e\s+ld h,d\s+add hl,hl\s+add hl,de\s+add hl,hl\s+add hl,hl\s+add hl,de\s+ex de,hl/i,
    "record stride 13 should use a five-add binary chain");

  const recursive = compile("record-alias-recursive", `${declarations}
sub Walk:
  with Actors[I] as Actor
    Actor.X += 1
    Walk
  end with
  return
end sub
Walk
loop forever`, false);
  assert.match(recursive, /proven non-reentrant/i, "recursive alias rejection should explain the safety rule");

  const nmi = compile("record-alias-nmi", `${declarations}
on frame Tick
sub Tick:
  with Actors[I] as Actor
    Actor.X += 1
  end with
  return
end sub
loop forever`, false);
  assert.match(nmi, /proven non-reentrant/i, "NMI alias rejection should explain the safety rule");

  const missing = compile("record-alias-unclosed", `${declarations}
with Actors[I] as Actor
  Actor.X = 1
loop forever`, false);
  assert.match(missing, /missing end with/i, "unclosed alias should identify the missing terminator");

  const unsafeEntry = compile("record-alias-unsafe-entry", `${declarations}
goto AliasBody
with Actors[I] as Actor
AliasBody:
  Actor.X = 7
end with
loop forever`, false);
  assert.match(unsafeEntry, /enters a record alias block before its pointer is initialized/i,
    "jumping into an alias block must fail closed");

  compile("record-alias-internal-jump", `${declarations}
with Actors[I] as Actor
  goto AliasBody
AliasBody:
  Actor.X = 7
end with
loop forever`);

  compile("record-alias-exit-jump", `${declarations}
with Actors[I] as Actor
  goto AliasDone
  Actor.X = 7
end with
AliasDone:
loop forever`);

  console.log("Record alias codegen safety: PASS (valid, return, recursion, NMI, lexical control flow)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
