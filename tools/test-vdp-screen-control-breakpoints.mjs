#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { breakpointEligibleLineNumbers, instrumentAmySourceWithSourceMarkers } from "../studio/core/editor/sourceBreakpoints.js";
import { GearcolecoTestCore, GEARCOLECO_TEST_INPUT, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
const source = `u8 Finished = 0

text screen
display on
nmi on
pause until press and release sleep after 5 seconds
screen off
nmi off
Finished = 1
loop forever
`;
const lines = source.trimEnd().split(/\r?\n/);
const displayLine = lines.indexOf("display on") + 1;
const screenOffLine = lines.indexOf("screen off") + 1;
const nmiOffLine = lines.indexOf("nmi off") + 1;
const eligible = breakpointEligibleLineNumbers(source);
assert(eligible.has(displayLine), "display on must accept a source breakpoint");
assert(eligible.has(screenOffLine), "screen off must accept a source breakpoint");
assert(eligible.has(nmiOffLine), "nmi off must accept a source breakpoint");

function compile(sourcePath, asmPath, optimizedPath, romPath, profile) {
  return new Promise((resolveRun, rejectRun) => {
    let output = "";
    const child = spawn(process.execPath, [
      "tools/amyc.mjs", sourcePath,
      "--asm", asmPath,
      "--optimized-asm", optimizedPath,
      "--rom", romPath,
      "--opt", profile
    ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", chunk => { output += chunk; });
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", code => code === 0 ? resolveRun() : rejectRun(new Error(output)));
  });
}

function addressOf(asm, name) {
  const match = asm.match(new RegExp(`^AMY_UVAR_${name}\\s+EQU\\s+\\$([0-9A-Fa-f]{4})$`, "m"));
  assert(match, `missing ${name} address`);
  return Number.parseInt(match[1], 16);
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

const temp = await mkdtemp(join(tmpdir(), "amy-vdp-screen-control-"));
try {
  const sourcePath = join(temp, "screen-control.alexis");
  await writeFile(sourcePath, instrumentAmySourceWithSourceMarkers(source));
  const bios = await readFile(resolve(root, "studio/bios/colecovision.rom"));
  for (const profile of profiles) {
    const asmPath = join(temp, `${profile}.asm`);
    const optimizedPath = join(temp, `${profile}-optimized.asm`);
    const romPath = join(temp, `${profile}.rom`);
    await compile(sourcePath, asmPath, optimizedPath, romPath, profile);
    const [asm, optimized, rom] = await Promise.all([
      readFile(asmPath, "utf8"),
      readFile(optimizedPath, "utf8"),
      readFile(romPath)
    ]);
    assert.match(optimized, /call AMY_SCREEN_OFF_NO_NMI/i, `${profile}: screen off was removed`);
    assert.doesNotMatch(optimized, /call AMY_DISABLE_NMI/i, `${profile}: redundant nmi off emitted code`);
    for (const line of [displayLine, screenOffLine, nmiOffLine]) {
      assert.match(asm, new RegExp(`; @amy-source-line ${line}\\b`), `${profile}: source line ${line} lost its marker`);
    }

    const core = await GearcolecoTestCore.create({ seed: 0x56445031 });
    try {
      core.loadBios(bios);
      core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
      for (let frame = 0; frame < 20; frame += 1) core.runFrame();
      assert.equal(core.getVdpRegisters()[1] & 0x40, 0x40, `${profile}: display did not turn on before pause`);
      core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
      for (let frame = 0; frame < 3; frame += 1) core.runFrame();
      core.setControllerMask(0, 0);
      for (let frame = 0; frame < 20; frame += 1) core.runFrame();
      assert.equal(core.readRam(addressOf(asm, "Finished"), 1)[0], 1, `${profile}: execution did not continue after pause`);
      assert.equal(core.getVdpRegisters()[1] & 0x60, 0, `${profile}: screen off / nmi off did not clear R1 bits 6 and 5`);
    } finally {
      core.destroy();
    }
  }

  const baselinePath = join(temp, "baseline.alexis");
  const baselineAsmPath = join(temp, "baseline.asm");
  await writeFile(baselinePath, "text screen\nloop forever\n");
  await compile(baselinePath, baselineAsmPath, join(temp, "baseline-optimized.asm"), join(temp, "baseline.rom"), "off");
  const baselineAsm = await readFile(baselineAsmPath, "utf8");
  const baselineWrites = countMatches(baselineAsm, /call WRITE_REGISTER/g);

  const adjacentSource = `text screen
display off
display on
loop forever
`;
  const adjacentPath = join(temp, "adjacent.alexis");
  const adjacentAsmPath = join(temp, "adjacent.asm");
  await writeFile(adjacentPath, adjacentSource);
  await compile(adjacentPath, adjacentAsmPath, join(temp, "adjacent-optimized.asm"), join(temp, "adjacent.rom"), "off");
  const adjacentAsm = await readFile(adjacentAsmPath, "utf8");
  assert.equal(countMatches(adjacentAsm, /call WRITE_REGISTER/g), baselineWrites + 1,
    "adjacent display off/on should omit the superseded first write");

  const barrierSource = `text screen
display on
nmi on
pause until press and release sleep after 1 seconds
screen off
nmi off
loop forever
`;
  const pauseBaselinePath = join(temp, "pause-baseline.alexis");
  const pauseBaselineAsmPath = join(temp, "pause-baseline.asm");
  await writeFile(pauseBaselinePath, `text screen
nmi on
pause until press and release sleep after 1 seconds
loop forever
`);
  await compile(pauseBaselinePath, pauseBaselineAsmPath, join(temp, "pause-baseline-optimized.asm"), join(temp, "pause-baseline.rom"), "off");
  const pauseBaselineAsm = await readFile(pauseBaselineAsmPath, "utf8");
  const pauseBaselineScreenOffs = countMatches(pauseBaselineAsm, /call AMY_SCREEN_OFF_NO_NMI/g);
  const barrierPath = join(temp, "barrier.alexis");
  const barrierAsmPath = join(temp, "barrier.asm");
  await writeFile(barrierPath, barrierSource);
  await compile(barrierPath, barrierAsmPath, join(temp, "barrier-optimized.asm"), join(temp, "barrier.rom"), "off");
  const barrierAsm = await readFile(barrierAsmPath, "utf8");
  assert.equal(countMatches(barrierAsm, /call AMY_SCREEN_OFF_NO_NMI/g), pauseBaselineScreenOffs + 1,
    "screen off after an active pause must not be mistaken for a return to the initial mode baseline");

  const combinedPath = join(temp, "combined-screen-off.alexis");
  const combinedAsmPath = join(temp, "combined-screen-off.asm");
  await writeFile(combinedPath, `text screen
screen on
screen off
loop forever
`);
  await compile(combinedPath, combinedAsmPath, join(temp, "combined-screen-off-optimized.asm"), join(temp, "combined-screen-off.rom"), "off");
  const combinedAsm = await readFile(combinedAsmPath, "utf8");

  const redundantPath = join(temp, "redundant-nmi-off.alexis");
  const redundantAsmPath = join(temp, "redundant-nmi-off.asm");
  await writeFile(redundantPath, `text screen
screen on
screen off
nmi off
loop forever
`);
  await compile(redundantPath, redundantAsmPath, join(temp, "redundant-nmi-off-optimized.asm"), join(temp, "redundant-nmi-off.rom"), "off");
  const redundantAsm = await readFile(redundantAsmPath, "utf8");
  assert.equal(countMatches(redundantAsm, /call AMY_DISABLE_NMI/g), countMatches(combinedAsm, /call AMY_DISABLE_NMI/g),
    "nmi off immediately after screen off must not add code in a release build");

  console.log(`VDP screen control and breakpoint test PASS (${profiles.length} profiles)`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
