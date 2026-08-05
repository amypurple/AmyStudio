import {
  decodeRomTestInputs,
  resolveAmyCheckpoint
} from "./romTestCase.js";

async function sha256(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", view);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function assertEqual(actual, expected, label) {
  if (expected && actual !== expected) {
    throw new Error(`${label} mismatch: ${actual} != ${expected}`);
  }
}

export async function replayRomTestCase(core, testCase, {
  biosBytes,
  romBytes,
  symbolsText = "",
  allowRebuiltRom = false
} = {}) {
  if (testCase?.format !== "amy-rom-test" || testCase?.version !== 1) {
    throw new Error("Unsupported Amy ROM test format.");
  }
  const biosHash = await sha256(biosBytes);
  const romHash = await sha256(romBytes);
  assertEqual(biosHash, testCase.environment?.biosSha256, "BIOS SHA-256");
  if (!allowRebuiltRom) {
    assertEqual(romHash, testCase.environment?.romSha256, "ROM SHA-256");
  }

  const target = testCase.target || {};
  let checkpoint = null;
  if (target.name) {
    if ((target.occurrence || 1) !== 1) {
      throw new Error(
        "Checkpoint occurrences above 1 require the future exact-resume API."
      );
    }
    checkpoint = resolveAmyCheckpoint(symbolsText, target.name);
    core.setExecuteBreakpoint(checkpoint.address);
  }

  const inputs = decodeRomTestInputs(testCase.inputRuns);
  let breakpointHit = false;
  for (const input of inputs) {
    for (let port = 0; port < 2; ++port) {
      core.setControllerMask(port, input.controllerMasks[port]);
      if (input.spinnerDeltas[port]) {
        core.setSpinner(port, input.spinnerDeltas[port]);
      }
    }
    const result = core.runFrame();
    if (!result.breakpointHit) continue;
    if (!checkpoint || result.pc !== checkpoint.address) {
      throw new Error(`Unexpected breakpoint at $${result.pc.toString(16)}.`);
    }
    breakpointHit = true;
    break;
  }

  if (checkpoint && !breakpointHit) {
    throw new Error(`Checkpoint ${checkpoint.symbol} was not reached.`);
  }
  if (!checkpoint && Number.isInteger(target.frame) &&
      target.frame !== inputs.length) {
    throw new Error(
      `Frame target ${target.frame} does not match ${inputs.length} inputs.`
    );
  }

  const framebuffer = core.getFramebuffer();
  const framebufferBytes = new Uint8Array(
    framebuffer.pixels.buffer,
    framebuffer.pixels.byteOffset,
    framebuffer.pixels.byteLength
  );
  const actual = {
    framebufferSha256: await sha256(framebufferBytes),
    vramSha256: await sha256(core.readVram(0, 0x4000)),
    vdpRegisters: [...core.getVdpRegisters()]
  };
  const expected = testCase.assertions || {};
  assertEqual(
    actual.framebufferSha256,
    expected.framebufferSha256,
    "Framebuffer SHA-256"
  );
  assertEqual(actual.vramSha256, expected.vramSha256, "VRAM SHA-256");
  if (expected.vdpRegisters?.length &&
      JSON.stringify(actual.vdpRegisters) !==
      JSON.stringify(expected.vdpRegisters)) {
    throw new Error(
      `VDP register mismatch: ${JSON.stringify(actual.vdpRegisters)} != ` +
      `${JSON.stringify(expected.vdpRegisters)}`
    );
  }
  return {
    pass: true,
    target: checkpoint || { frame: target.frame },
    actual,
    rebuiltRom: romHash !== testCase.environment?.romSha256
  };
}
