#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const source = `project "Stack watermark"
forever:
  asm {
    push bc
    push de
    push hl
    pop hl
    pop de
    pop bc
  }
  goto forever
`;

function compile(sourcePath, romPath) {
  return new Promise((resolveRun, rejectRun) => {
    let output = "";
    const child = spawn(process.execPath, ["tools/amyc.mjs", sourcePath, "--rom", romPath, "--opt", "off"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(output)));
  });
}

const temp = await mkdtemp(join(tmpdir(), "amy-stack-watermark-"));
try {
  const sourcePath = join(temp, "stack.alexis");
  const romPath = join(temp, "stack.rom");
  await writeFile(sourcePath, source, "utf8");
  await compile(sourcePath, romPath);
  const core = await GearcolecoTestCore.create({ seed: 0x5354414B });
  try {
    core.loadBios(await readFile(join(root, "studio", "bios", "colecovision.rom")));
    core.loadRom(await readFile(romPath), { region: GEARCOLECO_TEST_REGION.NTSC });
    for (let frame = 0; frame < 2; frame += 1) core.runFrame();
    let baseline = core.getSp();
    for (let step = 0; step < 256; step += 1) {
      core.stepInstruction();
      baseline = Math.max(baseline, core.getSp());
    }
    for (let step = 0; step < 256 && core.getSp() !== baseline; step += 1) core.stepInstruction();
    assert.equal(core.getSp(), baseline, "could not align the test at its restored stack baseline");
    core.beginStackWatermark();
    for (let frame = 0; frame < 4; frame += 1) core.runFrame();
    const mark = core.getStackWatermark();
    assert.ok(mark.minimum < mark.start, `temporary pushes did not lower the stack watermark: ${JSON.stringify(mark)}`);
    assert.ok(mark.bytes >= 6, `expected at least 6 stack bytes, observed ${mark.bytes}`);
    for (let step = 0; step < 256 && core.getSp() !== mark.start; step += 1) core.stepInstruction();
    assert.equal(core.getSp(), mark.start, "test loop never restored SP after temporary pushes");
    core.endStackWatermark();
  } finally {
    core.destroy();
  }
  console.log("GearColeco instruction-granularity stack watermark PASS");
} finally {
  await rm(temp, { recursive: true, force: true });
}
