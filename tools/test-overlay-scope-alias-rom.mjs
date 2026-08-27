#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const temp = await mkdtemp(join(tmpdir(), "amy-overlay-alias-"));

const shared = `project "OVERLAY SCOPE ALIAS"
memory "colecovision_legacy_sdcc"
record GameState:
  u8 X
  u8 Y
  u16 Score
  u8 Tiles[4]
end record
overlay SceneRam
  Menu as GameState
  Game as GameState
end overlay
`;

const full = `${shared}' alias start
SceneRam.Game.X = 7
SceneRam.Game.Y = SceneRam.Game.X + 2
SceneRam.Game.Score = 4660
SceneRam.Game.Tiles[1] = SceneRam.Game.Y
if SceneRam.Game.Tiles[1] = 9 then SceneRam.Game.Score += 1
print at SceneRam.Game.X,1,"G.X"
' G.X must remain a comment
' alias end
loop forever
`;

const aliased = `${shared}with SceneRam.Game as G
G.X = 7
G.Y = G.X + 2
G.Score = 4660
G.Tiles[1] = G.Y
if G.Tiles[1] = 9 then G.Score += 1
print at G.X,1,"G.X"
' G.X must remain a comment
end with
loop forever
`;

function compile(source, asm, rom, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`${profile} compile failed:\n${output}`)));
  });
}

async function assertCompileFails(name, sourceText) {
  const source = join(temp, `${name}.alexis`);
  await writeFile(source, sourceText);
  await assert.rejects(
    compile(source, join(temp, `${name}.asm`), join(temp, `${name}.rom`), "balanced"),
    /compile failed/
  );
}

try {
  const fullSource = join(temp, "full.alexis");
  const aliasSource = join(temp, "alias.alexis");
  await Promise.all([writeFile(fullSource, full), writeFile(aliasSource, aliased)]);
  for (const profile of profiles) {
    const fullAsm = join(temp, `full-${profile}.asm`);
    const aliasAsm = join(temp, `alias-${profile}.asm`);
    const fullRom = join(temp, `full-${profile}.rom`);
    const aliasRom = join(temp, `alias-${profile}.rom`);
    await compile(fullSource, fullAsm, fullRom, profile);
    await compile(aliasSource, aliasAsm, aliasRom, profile);
    assert.deepEqual(await readFile(aliasRom), await readFile(fullRom), `${profile}: alias ROM differs from fully qualified ROM`);
  }
  await assertCompileFails("unknown-overlay-part", `${shared}with Missing.Game as G\nG.X = 1\nend with\nloop forever\n`);
  await assertCompileFails("duplicate-alias", `${shared}with SceneRam.Game as G\nwith SceneRam.Menu as G\nend with\nend with\nloop forever\n`);
  await assertCompileFails("missing-end-with", `${shared}with SceneRam.Game as G\nG.X = 1\nloop forever\n`);
  console.log(`overlay scope alias ROM equivalence: PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
