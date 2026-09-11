#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const privateBenchmarkPath = resolve(root, "competition/benchmarks/sprite-metasprite/amy-sprite-metasprite.alexis");
const canonicalPath = existsSync(privateBenchmarkPath)
  ? privateBenchmarkPath
  : resolve(root, "studio/examples-src/toolchain-benchmark-sprite-metasprite.alexis");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];

function compile(source, asm, rom, profile, expectFailure = null) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ["tools/amyc.mjs", source, "--asm", asm, "--rom", rom, "--opt", profile], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", (code) => {
      try {
        if (expectFailure) {
          assert.notEqual(code, 0, `${source}: invalid animation compiled`);
          assert.match(output, expectFailure);
        } else {
          assert.equal(code, 0, output);
        }
        resolveRun();
      } catch (error) {
        rejectRun(error);
      }
    });
  });
}

function makeAnimationSource(source) {
  const manualState = `u8 AnimationTick = 0\nu8 AnimationFrame = 0`;
  const manualAdvance = `  AnimationTick += 1
  if AnimationTick = 8 then
    AnimationTick = 0
    if AnimationFrame = 0 then
      AnimationFrame = 1
    else
      AnimationFrame = 0
    end if
  end if

  set metasprite PlayerMeta frame AnimationFrame to PlayerY,PlayerX using sprite 0`;
  assert.ok(source.includes(manualState), "canonical animation state changed");
  assert.ok(source.includes(manualAdvance), "canonical animation loop changed");
  return source
    .replace(manualState, "animation PlayerWalk using PlayerMeta every 8 updates")
    .replace(manualAdvance, "  update animation PlayerWalk to PlayerY,PlayerX using sprite 0");
}

async function inspect(romBytes, bios) {
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

const output = await mkdtemp(join(tmpdir(), "amy-animation-service-"));
try {
  const canonical = await readFile(canonicalPath, "utf8");
  const animationPath = join(output, "animation.alexis");
  await writeFile(animationPath, makeAnimationSource(canonical));
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));

  for (const profile of profiles) {
    const manualRom = join(output, `${profile}-manual.rom`);
    const animationRom = join(output, `${profile}-animation.rom`);
    await compile(canonicalPath, join(output, `${profile}-manual.asm`), manualRom, profile);
    await compile(animationPath, join(output, `${profile}-animation.asm`), animationRom, profile);
    const [manualBytes, animationBytes] = await Promise.all([readFile(manualRom), readFile(animationRom)]);
    const [manualState, animationState] = await Promise.all([inspect(manualBytes, bios), inspect(animationBytes, bios)]);
    assert.deepEqual(animationState, manualState, `${profile}: animation service differs from manual runtime state`);
    assert.ok(animationBytes.length <= manualBytes.length, `${profile}: animation service grew the ROM`);
    console.log(`${profile}: manual=${manualBytes.length} animation=${animationBytes.length} delta=${animationBytes.length - manualBytes.length}`);
  }

  const invalidCases = [
    ["unknown-meta", "animation Walk using Missing every 8 updates\n", /unknown metasprite/i],
    ["zero", "data M metasprite layers 1\n frame 0,1\nend data\nanimation Walk using M every 0 updates\n", /interval from 1 to 255/i],
    ["late", "update animation Walk to 1,1 using sprite 0\ndata M metasprite layers 1\n frame 0,1\nend data\nanimation Walk using M every 8 updates\n", /declare it before/i],
    ["local", "data M metasprite layers 1\n frame 0,1\nend data\nsub Work:\n animation Walk using M every 8 updates\nend sub\n", /top level before routines/i]
  ];
  for (const [id, source, expected] of invalidCases) {
    const sourcePath = join(output, `${id}.alexis`);
    await writeFile(sourcePath, source);
    await compile(sourcePath, join(output, `${id}.asm`), join(output, `${id}.rom`), "balanced", expected);
  }
} finally {
  if (process.env.AMY_KEEP_TEST_OUTPUT) console.log(`kept test output: ${output}`);
  else await rm(output, { recursive: true, force: true });
}

console.log("animation service prototype PASS (5 profiles, runtime-equivalent, fail-closed diagnostics)");
