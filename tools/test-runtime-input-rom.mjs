import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { GearcolecoTestCore, GEARCOLECO_TEST_REGION } from "../studio/core/gearcolecoTestCore.js";

const root = resolve(import.meta.dirname, "..");
const optimization = process.argv[2] || "balanced";
const profiles = ["off", "safe", "balanced", "aggressive", "experimental"];
if (!profiles.includes(optimization)) throw new Error(`Unknown optimization profile: ${optimization}`);

function parseSymbols(text) {
  return new Map(text.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^[0-9A-Fa-f]{2}:([0-9A-Fa-f]{4})\s+(\S+)/);
    return match ? [[match[2], Number.parseInt(match[1], 16)]] : [];
  }));
}

async function compile(outputDir) {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/check-examples.mjs", "--assemble", "--only", "amy-runtime-input-expression-test",
      "--optimization", optimization, "--rom-dir", outputDir
    ], { cwd: root, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Compilation failed: ${code}`)));
  });
}

function runUntilBreakpoint(core, address, frameBudget) {
  core.setExecuteBreakpoint(address);
  try {
    for (let frame = 0; frame < frameBudget; frame += 1) {
      const result = core.runFrame();
      if (result.breakpointHit && result.pc === address) return true;
    }
    return false;
  } finally {
    core.clearExecuteBreakpoint(address);
  }
}

function signedByte(value) { return value >= 0x80 ? value - 0x100 : value; }

const outputDir = await mkdtemp(join(tmpdir(), "amy-runtime-input-rom-"));
try {
  await compile(outputDir);
  const base = join(outputDir, "amy-runtime-input-expression-test");
  const [bios, rom, symbolText] = await Promise.all([
    readFile(resolve(root, "studio/bios/colecovision.rom")),
    readFile(`${base}.rom`),
    readFile(`${base}.sym`, "utf8")
  ]);
  const symbols = parseSymbols(symbolText);
  const names = [
    "AMY_ULBL_TEST_input_expression_before", "AMY_ULBL_TEST_input_expression_after",
    "AMY_UVAR_SpinSelected", "AMY_UVAR_SpinExpression", "SPINNER_1", "SPINNER_2"
  ];
  for (const name of names) assert.ok(symbols.has(name), `Missing symbol ${name}`);

  const core = await GearcolecoTestCore.create({ seed: 0x494E5054 });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    assert.equal(runUntilBreakpoint(core, symbols.get(names[0]), 180), true, "before checkpoint not reached");

    const afterAddress = symbols.get(names[1]);
    core.setExecuteBreakpoint(afterAddress);
    let reachedAfter = false;
    try {
      for (let frame = 0; frame < 20; frame += 1) {
        core.setSpinner(0, 6);
        core.setSpinner(1, -7);
        const result = core.runFrame();
        if (result.breakpointHit && result.pc === afterAddress) {
          reachedAfter = true;
          break;
        }
      }
    } finally {
      core.clearExecuteBreakpoint(afterAddress);
    }
    assert.equal(reachedAfter, true, "after checkpoint not reached");

    const selected = signedByte(core.readRam(symbols.get("AMY_UVAR_SpinSelected"), 1)[0]);
    const expression = signedByte(core.readRam(symbols.get("AMY_UVAR_SpinExpression"), 1)[0]);
    const spinner1 = signedByte(core.readRam(symbols.get("SPINNER_1"), 1)[0]);
    const spinner2 = signedByte(core.readRam(symbols.get("SPINNER_2"), 1)[0]);
    assert.notEqual(selected, 0, "spinner(Port) did not consume the injected port-1 movement");
    assert.notEqual(expression, 0, "spinner(3 - Port) did not consume the injected port-2 movement");
    assert.equal(spinner1, 0, "dynamic spinner 1 read did not consume its accumulator");
    assert.equal(spinner2, 0, "dynamic spinner 2 read did not consume its accumulator");
    console.log(`runtime input ROM: PASS (${optimization}; selected=${selected}, expression=${expression})`);
  } finally {
    core.destroy();
  }
} finally {
  await rm(outputDir, { recursive: true, force: true });
}