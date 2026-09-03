#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const benchmarkPath = resolve(root, "competition/benchmarks/sprite-metasprite/amy-sprite-metasprite.alexis");
const canonicalPath = existsSync(benchmarkPath)
  ? benchmarkPath
  : resolve(root, "studio/examples-src/toolchain-benchmark-sprite-metasprite.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

function compile(source, asm, rom, profile) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      stdio: "inherit"
    });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Compilation failed: ${code}`)));
  });
}

function compileMustFail(source, asm, rom, expected) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", "balanced"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", (code) => {
      try {
        assert.notEqual(code, 0, `${source}: invalid metasprite source compiled`);
        assert.match(output, expected);
        resolveRun();
      } catch (error) {
        rejectRun(error);
      }
    });
  });
}

const nativeDeclaration = `data PlayerMeta metasprite layers 3
  frame 0,15, 4,11, 8,1
  frame 12,15, 16,11, 20,1
end data
`;
const nativeRender = "  set metasprite PlayerMeta frame AnimationFrame to PlayerY,PlayerX using sprite 0";
const explicitRender = `  if AnimationFrame = 0 then
    set sprite 0 to PlayerY,PlayerX,0,15
    set sprite 1 to PlayerY,PlayerX,4,11
    set sprite 2 to PlayerY,PlayerX,8,1
  else
    set sprite 0 to PlayerY,PlayerX,12,15
    set sprite 1 to PlayerY,PlayerX,16,11
    set sprite 2 to PlayerY,PlayerX,20,1
  end if`;

function makeLoopPrototype(source) {
  const declarations = `u8 FrameOffset = 0
u8 Layer = 0
u8 LayerOffset = 0

' Three {pattern, color} pairs per frame, ordered by hardware priority.
data PlayerMetaLayers bytes
  0,15, 4,11, 8,1
  12,15, 16,11, 20,1
end data
`;
  const dataDriven = `  FrameOffset = AnimationFrame * 6
  for Layer = 0 to 2
    LayerOffset = FrameOffset + Layer * 2
    set sprite Layer to PlayerY,PlayerX,PlayerMetaLayers[LayerOffset],PlayerMetaLayers[LayerOffset+1]
  next`;
  assert.ok(source.includes(nativeDeclaration), "canonical metasprite declaration changed");
  assert.ok(source.includes(nativeRender), "canonical metasprite renderer changed");
  return source
    .replace(nativeDeclaration, declarations)
    .replace(nativeRender, dataDriven);
}

function makeExplicitPrototype(source) {
  assert.ok(source.includes(nativeDeclaration), "canonical metasprite declaration changed");
  assert.ok(source.includes(nativeRender), "canonical metasprite renderer changed");
  return source.replace(nativeDeclaration, "").replace(nativeRender, explicitRender);
}

async function inspectRom(romBytes, bios) {
  const core = await GearcolecoTestCore.create({ seed: 0x5a17 });
  try {
    core.loadBios(bios);
    core.loadRom(romBytes, { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 180; frame += 1) core.runFrame();
    const registers = core.getVdpRegisters();
    const patternBase = (registers[6] & 7) * 0x800;
    const attributeBase = (registers[5] & 0x7f) * 0x80;
    return {
      patterns: [...core.readVram(patternBase, 192)],
      attributes: [...core.readVram(attributeBase, 25)]
    };
  } finally {
    core.destroy();
  }
}

const output = await mkdtemp(join(tmpdir(), "amy-metasprite-data-"));
try {
  const canonical = await readFile(canonicalPath, "utf8");
  const explicitPath = join(output, "explicit.alexis");
  const prototypePath = join(output, "prototype.alexis");
  await writeFile(explicitPath, makeExplicitPrototype(canonical));
  await writeFile(prototypePath, makeLoopPrototype(canonical));
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  const rows = [];
  for (const profile of profiles) {
    const explicitRom = join(output, `${profile}-explicit.rom`);
    const prototypeRom = join(output, `${profile}-prototype.rom`);
    const nativeRom = join(output, `${profile}-native.rom`);
    await compile(explicitPath, join(output, `${profile}-explicit.asm`), explicitRom, profile);
    await compile(prototypePath, join(output, `${profile}-prototype.asm`), prototypeRom, profile);
    await compile(canonicalPath, join(output, `${profile}-native.asm`), nativeRom, profile);
    const [explicitBytes, prototypeBytes, nativeBytes] = await Promise.all([readFile(explicitRom), readFile(prototypeRom), readFile(nativeRom)]);
    const [explicitState, prototypeState, nativeState] = await Promise.all([
      inspectRom(explicitBytes, bios),
      inspectRom(prototypeBytes, bios),
      inspectRom(nativeBytes, bios)
    ]);
    assert.deepEqual(prototypeState, explicitState, `${profile}: data-driven renderer differs at runtime`);
    assert.deepEqual(nativeState, explicitState, `${profile}: native metasprite renderer differs at runtime`);
    rows.push({ profile, explicit: explicitBytes.length, prototype: prototypeBytes.length, native: nativeBytes.length });
  }
  for (const row of rows) console.log(`${row.profile}: explicit=${row.explicit} loop=${row.prototype} native=${row.native} native-delta=${row.native - row.explicit}`);
  assert.ok(rows.every((row) => row.prototype < row.explicit), "loop prototype must save ROM in every profile");
  assert.ok(rows.every((row) => row.native < row.explicit), "native prototype must save ROM in every profile");

  const invalidCases = [
    ["layers", "data Bad metasprite layers 5\n frame 0,1\nend data\n", /layer count from 1 to 4/i],
    ["pairs", "data Bad metasprite layers 2\n frame 0,1\nend data\n", /requires 2 pattern\/color pairs/i],
    ["frame", "data M metasprite layers 1\n frame 0,1\nend data\nset metasprite M frame 1 to 1,1 using sprite 0\n", /outside 0\.\.0/i],
    ["range", "data M metasprite layers 2\n frame 0,1,2,3\nend data\nset metasprite M frame 0 to 1,1 using sprite 31\n", /range within 0\.\.31/i]
  ];
  for (const [id, sourceText, expected] of invalidCases) {
    const sourcePath = join(output, `invalid-${id}.alexis`);
    await writeFile(sourcePath, sourceText);
    await compileMustFail(sourcePath, join(output, `invalid-${id}.asm`), join(output, `invalid-${id}.rom`), expected);
  }
} finally {
  if (process.env.AMY_KEEP_TEST_OUTPUT) console.log(`kept test output: ${output}`);
  else await rm(output, { recursive: true, force: true });
}

console.log("metasprite data prototype: PASS (5 profiles, runtime-equivalent)");
