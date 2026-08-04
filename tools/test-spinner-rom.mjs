import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_INPUT,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const repoRoot = resolve(import.meta.dirname, "..");

async function compileSpinnerExample(outputDir, optimization) {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [
      "tools/check-examples.mjs",
      "--assemble",
      "--only", "cvbasic-spinner-port",
      "--optimization", optimization,
      "--rom-dir", outputDir
    ], { cwd: repoRoot, stdio: "inherit" });
    child.on("error", rejectRun);
    child.on("exit", (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`Spinner example compilation failed with exit code ${code}.`));
    });
  });
}

function parseSymbols(text) {
  return new Map(text.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^[0-9A-Fa-f]{2}:([0-9A-Fa-f]{4})\s+(\S+)/);
    return match ? [[match[2], Number.parseInt(match[1], 16)]] : [];
  }));
}

function runFrames(core, count, spinnerPort = -1, spinnerDelta = 0) {
  for (let frame = 0; frame < count; ++frame) {
    if (spinnerPort >= 0) core.setSpinner(spinnerPort, spinnerDelta);
    core.runFrame();
  }
}

function signedByte(value) {
  return value >= 0x80 ? value - 0x100 : value;
}

const optimization = process.argv[2] || "balanced";
if (!["off", "safe", "balanced", "aggressive", "experimental"].includes(optimization)) {
  throw new Error(`Unknown optimization profile: ${optimization}`);
}

const outputDir = await mkdtemp(join(tmpdir(), "amy-spinner-rom-"));
try {
  await compileSpinnerExample(outputDir, optimization);
  const [bios, rom, symbolText] = await Promise.all([
    readFile(process.env.AMY_COLECO_BIOS || resolve(repoRoot, "studio/bios/colecovision.rom")),
    readFile(resolve(outputDir, "cvbasic-spinner-port.rom")),
    readFile(resolve(outputDir, "cvbasic-spinner-port.sym"), "utf8")
  ]);
  const symbols = parseSymbols(symbolText);
  const required = [
    "AMY_ULBL_game_loop", "AMY_UVAR_X", "AMY_UVAR_Y",
    "SPINNER_ENABLED",
    "SPINNER_1", "SPINNER_2", "VRAM_SPR_ATTR"
  ];
  for (const name of required) assert.ok(symbols.has(name), `Missing symbol ${name}.`);

  const core = await GearcolecoTestCore.create({ seed: 0x5350494E });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    runFrames(core, 120);

    const gameLoop = symbols.get("AMY_ULBL_game_loop");
    core.setExecuteBreakpoint(gameLoop);
    core.setControllerMask(0, GEARCOLECO_TEST_INPUT.FIRE_LEFT);
    runFrames(core, 4);
    core.setControllerMask(0, 0);
    let enteredGame = false;
    for (let frame = 0; frame < 20; ++frame) {
      const result = core.runFrame();
      if (result.breakpointHit && result.pc === gameLoop) {
        enteredGame = true;
        break;
      }
    }
    core.clearExecuteBreakpoint(gameLoop);
    assert.equal(enteredGame, true, "Spinner example did not leave its FIRE prompt.");
    runFrames(core, 6);

    assert.equal(core.readRam(symbols.get("SPINNER_ENABLED"), 1)[0], 0xFF);
    const baseline = core.saveState();
    const baselineX = core.readRam(symbols.get("AMY_UVAR_X"), 1)[0];
    const baselineY = core.readRam(symbols.get("AMY_UVAR_Y"), 1)[0];
    const spriteAddress = symbols.get("VRAM_SPR_ATTR");
    const baselineSprite = [...core.readVram(spriteAddress, 4)];

    const cases = [
      { port: 0, delta: 6, coordinate: "X", direction: 1 },
      { port: 0, delta: -6, coordinate: "X", direction: -1 },
      { port: 1, delta: 6, coordinate: "Y", direction: 1 },
      { port: 1, delta: -6, coordinate: "Y", direction: -1 }
    ];
    const results = [];
    for (const testCase of cases) {
      core.loadState(baseline, { controllerMasks: [0, 0] });
      runFrames(core, 8, testCase.port, testCase.delta);
      const x = core.readRam(symbols.get("AMY_UVAR_X"), 1)[0];
      const y = core.readRam(symbols.get("AMY_UVAR_Y"), 1)[0];
      const spinner = signedByte(core.readRam(symbols.get(`SPINNER_${testCase.port + 1}`), 1)[0]);
      const sprite = [...core.readVram(spriteAddress, 4)];
      const movement = testCase.coordinate === "X" ? x - baselineX : y - baselineY;
      assert.equal(Math.sign(movement), testCase.direction, `${testCase.coordinate} moved in the wrong direction.`);
      runFrames(core, 8);
      const settledCoordinate = core.readRam(symbols.get(`AMY_UVAR_${testCase.coordinate}`), 1)[0];
      const settledSpinner = signedByte(core.readRam(symbols.get(`SPINNER_${testCase.port + 1}`), 1)[0]);
      assert.equal(settledSpinner, 0, `Spinner ${testCase.port + 1} must be empty after its delta is consumed.`);
      runFrames(core, 8);
      const idleCoordinate = core.readRam(symbols.get(`AMY_UVAR_${testCase.coordinate}`), 1)[0];
      assert.equal(idleCoordinate, settledCoordinate, "Consumed spinner delta must not keep moving without new ticks.");
      assert.notDeepEqual(sprite, baselineSprite, "Sprite attributes did not reflect spinner movement.");
      const spriteMovement = testCase.coordinate === "X"
        ? sprite[1] - baselineSprite[1] : sprite[0] - baselineSprite[0];
      assert.equal(Math.sign(spriteMovement), testCase.direction, "Sprite moved in the wrong direction.");
      results.push({ ...testCase, x, y, spinnerBeforeSettle: spinner, settledSpinner, idleCoordinate, sprite });
    }

    console.log(`Amy spinner ROM integration PASS (${optimization})`);
    console.log(JSON.stringify({ baseline: { x: baselineX, y: baselineY, sprite: baselineSprite }, results }, null, 2));
  } finally {
    core.destroy();
  }
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
