function normalizeCheckpointName(value) {
  return String(value || "").trim().replace(/^AMY_ULBL_TEST_/i, "");
}

export function parseAmySymbols(symbolsText) {
  const symbols = new Map();
  for (const line of String(symbolsText || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    const addressFirst = trimmed.match(/^(?:[0-9A-Fa-f]{2}:)?([0-9A-Fa-f]{4})\s+([A-Za-z_.$?][A-Za-z0-9_.$?]*)$/);
    const equ = trimmed.match(/^([A-Za-z_.$?][A-Za-z0-9_.$?]*)\s*:\s*equ\s+(?:\$|0x)?([0-9A-Fa-f]{1,4})$/i);
    if (addressFirst) symbols.set(addressFirst[2], Number.parseInt(addressFirst[1], 16));
    else if (equ) symbols.set(equ[1], Number.parseInt(equ[2], 16));
  }
  return symbols;
}

export function listAmyCheckpoints(symbolsText) {
  return [...parseAmySymbols(symbolsText).keys()]
    .filter((name) => name.startsWith("AMY_ULBL_TEST_"))
    .map((name) => name.slice("AMY_ULBL_TEST_".length))
    .sort();
}

export function resolveAmyCheckpoint(symbolsText, checkpointName) {
  const normalized = normalizeCheckpointName(checkpointName);
  const symbol = `AMY_ULBL_TEST_${normalized}`;
  const address = parseAmySymbols(symbolsText).get(symbol);
  if (!Number.isInteger(address)) {
    throw new Error(`Checkpoint symbol not found: ${symbol}`);
  }
  return { name: normalized, symbol, address };
}

function sameInput(left, right) {
  return left.controllerMasks[0] === right.controllerMasks[0] &&
    left.controllerMasks[1] === right.controllerMasks[1] &&
    left.spinnerDeltas[0] === right.spinnerDeltas[0] &&
    left.spinnerDeltas[1] === right.spinnerDeltas[1];
}

export function encodeRomTestInputs(inputs) {
  const runs = [];
  for (const input of inputs) {
    const normalized = {
      controllerMasks: [
        input?.controllerMasks?.[0] >>> 0,
        input?.controllerMasks?.[1] >>> 0
      ],
      spinnerDeltas: [
        input?.spinnerDeltas?.[0] | 0,
        input?.spinnerDeltas?.[1] | 0
      ]
    };
    const previous = runs[runs.length - 1];
    if (previous && sameInput(previous, normalized)) {
      ++previous.frames;
    } else {
      runs.push({ frames: 1, ...normalized });
    }
  }
  return runs;
}

export function decodeRomTestInputs(runs) {
  const inputs = [];
  for (const run of runs || []) {
    if (!Number.isInteger(run.frames) || run.frames < 1) {
      throw new Error("ROM test input run length must be a positive integer.");
    }
    for (let frame = 0; frame < run.frames; ++frame) {
      inputs.push({
        controllerMasks: [
          run.controllerMasks?.[0] >>> 0,
          run.controllerMasks?.[1] >>> 0
        ],
        spinnerDeltas: [
          run.spinnerDeltas?.[0] | 0,
          run.spinnerDeltas?.[1] | 0
        ]
      });
    }
  }
  return inputs;
}

export function createRomTestCase({
  name,
  projectName,
  seed,
  region = "ntsc",
  biosSha256,
  romSha256,
  inputs,
  checkpoint = null,
  assertions = {}
}) {
  const normalizedCheckpoint = checkpoint
    ? {
        name: normalizeCheckpointName(checkpoint.name),
        occurrence: Math.max(1, checkpoint.occurrence | 0)
      }
    : null;
  return {
    format: "amy-rom-test",
    version: 1,
    name: String(name || "ROM test"),
    project: String(projectName || "amy-project"),
    environment: {
      seed: seed >>> 0,
      region: String(region || "ntsc").toLowerCase(),
      biosSha256: String(biosSha256 || ""),
      romSha256: String(romSha256 || "")
    },
    target: normalizedCheckpoint || { frame: (inputs || []).length },
    inputRuns: encodeRomTestInputs(inputs || []),
    assertions: {
      framebufferSha256: assertions.framebufferSha256 || "",
      vramSha256: assertions.vramSha256 || "",
      vdpRegisters: Array.isArray(assertions.vdpRegisters)
        ? assertions.vdpRegisters.map((value) => value & 0xFF)
        : []
    }
  };
}
