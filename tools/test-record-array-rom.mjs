#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const repoRoot = resolve(import.meta.dirname, "..");
const outputDir = await mkdtemp(join(tmpdir(), "amy-record-array-rom-"));
const optimization = process.argv[2] || "balanced";
const exampleIds = [
  "amy-record-array-safety-selftest",
  "amy-record-array-cost-record",
  "amy-record-array-cost-parallel"
];

function compileExamples() {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/check-examples.mjs",
      "--assemble",
      "--only", exampleIds.join(","),
      "--optimization", optimization,
      "--rom-dir", outputDir
    ], { cwd: repoRoot, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0
      ? resolveRun()
      : rejectRun(new Error(`Record-array compilation failed with exit code ${code}.`)));
  });
}

function parseSymbols(text) {
  return new Map(text.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^[0-9A-Fa-f]{2}:([0-9A-Fa-f]{4})\s+(\S+)/);
    return match ? [[match[2], Number.parseInt(match[1], 16)]] : [];
  }));
}

try {
  await compileExamples();
  const safetyBase = join(outputDir, "amy-record-array-safety-selftest");
  const [bios, rom, symbolText, recordStat, parallelStat] = await Promise.all([
    readFile(resolve(repoRoot, "studio/bios/colecovision.rom")),
    readFile(`${safetyBase}.rom`),
    readFile(`${safetyBase}.sym`, "utf8"),
    stat(join(outputDir, "amy-record-array-cost-record.rom")),
    stat(join(outputDir, "amy-record-array-cost-parallel.rom"))
  ]);
  rom[0] = 0x55;
  rom[1] = 0xAA;
  const symbols = parseSymbols(symbolText);
  const done = symbols.get("AMY_ULBL_record_array_safety_done");
  const passAddress = symbols.get("AMY_UVAR_PassCount");
  const failAddress = symbols.get("AMY_UVAR_FailCount");
  assert.ok(Number.isInteger(done), "Missing record_array_safety_done label.");
  assert.ok(Number.isInteger(passAddress), "Missing PassCount symbol.");
  assert.ok(Number.isInteger(failAddress), "Missing FailCount symbol.");

  const core = await GearcolecoTestCore.create({ seed: 0x52454344 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    core.setExecuteBreakpoint(done);
    let reached = false;
    for (let frame = 0; frame < 120; frame += 1) {
      const result = core.runFrame();
      if (result.breakpointHit && result.pc === done) {
        reached = true;
        break;
      }
    }
    assert.equal(reached, true, "Record-array safety self-test did not finish within 120 frames.");
    const actualPass = core.readRam(passAddress, 1)[0];
    const actualFail = core.readRam(failAddress, 1)[0];
    console.log(`Record runtime counters: pass=${actualPass}, fail=${actualFail}`);
    assert.equal(actualPass, 25, "Not every record-array assertion passed.");
    assert.equal(actualFail, 0, "At least one record-array assertion failed.");
  } finally {
    core.destroy();
  }

  const overhead = recordStat.size - parallelStat.size;
  const ratio = recordStat.size / parallelStat.size;
  console.log(`Amy record-array ROM self-test PASS (${optimization}: 25 assertions)`);
  console.log(`Parallel arrays: ${parallelStat.size} bytes`);
  console.log(`Record array:    ${recordStat.size} bytes`);
  console.log(`Record overhead: ${overhead >= 0 ? "+" : ""}${overhead} bytes (${ratio.toFixed(2)}x)`);
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
