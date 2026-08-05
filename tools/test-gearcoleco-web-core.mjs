import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import {
  GearcolecoTestCore,
  GEARCOLECO_TEST_REGION
} from "../studio/core/gearcolecoTestCore.js";

const repoRoot = resolve(import.meta.dirname, "..");

function parseArguments(argv) {
  const options = {
    bios: process.env.AMY_COLECO_BIOS || resolve(repoRoot, "studio/bios/colecovision.rom"),
    rom: "",
    frames: 10,
    symbols: "",
    checkpoint: ""
  };
  for (let index = 0; index < argv.length; ++index) {
    const arg = argv[index];
    if (arg === "--bios") options.bios = resolve(argv[++index]);
    else if (arg === "--rom") options.rom = resolve(argv[++index]);
    else if (arg === "--frames") options.frames = Number(argv[++index]);
    else if (arg === "--symbols") options.symbols = resolve(argv[++index]);
    else if (arg === "--checkpoint") options.checkpoint = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.rom) {
    throw new Error("Usage: node tools/test-gearcoleco-web-core.mjs --rom path/to/test.rom");
  }
  return options;
}

function resolveCheckpointAddress(symbols, checkpoint) {
  if (!checkpoint) return null;
  const symbolName = `AMY_ULBL_TEST_${checkpoint}`;
  const line = symbols.split(/\r?\n/).find((candidate) => {
    return candidate.trim().endsWith(` ${symbolName}`);
  });
  if (!line) throw new Error(`Checkpoint symbol not found: ${symbolName}`);
  const match = line.match(/^[0-9A-Fa-f]{2}:([0-9A-Fa-f]{4})\s+/);
  if (!match) throw new Error(`Invalid symbol line for ${symbolName}: ${line}`);
  return Number.parseInt(match[1], 16);
}

function hashBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function runOnce(options, bios, rom, checkpointAddress) {
  const core = await GearcolecoTestCore.create({ seed: 0xA5A55A5A });
  try {
    core.loadBios(bios);
    core.loadRom(rom, { region: GEARCOLECO_TEST_REGION.NTSC });
    let framesRun = 0;
    let checkpointHit = false;
    let lastPc = 0;
    const pcBeforeStep = core.getPc();
    const instructionStep = core.stepInstruction();
    if (instructionStep.pc === pcBeforeStep) {
      throw new Error("GearColeco instruction step did not advance the program counter.");
    }

    if (checkpointAddress !== null) core.setExecuteBreakpoint(checkpointAddress);
    for (; framesRun < options.frames; ++framesRun) {
      const result = core.runFrame();
      lastPc = result.pc;
      if (result.breakpointHit) {
        checkpointHit = true;
        if (result.pc !== checkpointAddress) {
          throw new Error(
            `Breakpoint stopped at $${result.pc.toString(16)}, expected ` +
            `$${checkpointAddress.toString(16)}.`
          );
        }
        ++framesRun;
        break;
      }
    }
    if (checkpointAddress !== null && !checkpointHit) {
      throw new Error(
        `Checkpoint $${checkpointAddress.toString(16)} was not reached ` +
        `within ${options.frames} frames.`
      );
    }
    const cpu = core.getCpuState();
    if (cpu.pc !== core.getPc() || cpu.sp !== core.getSp()) {
      throw new Error("GearColeco CPU state does not match the direct PC/SP APIs.");
    }
    const instruction = core.disassemble(cpu.pc);
    if (instruction.address !== cpu.pc || instruction.size < 1 ||
        instruction.size > 7 || !instruction.text) {
      throw new Error("GearColeco disassembler returned an invalid current instruction.");
    }
    const state = core.saveState();
    const framebuffer = core.getFramebuffer();
    const vram = core.readVram(0, 0x4000);
    const registers = core.getVdpRegisters();
    return {
      stateHash: hashBytes(state),
      framebufferHash: hashBytes(
        new Uint8Array(framebuffer.pixels.buffer)
      ),
      vramHash: hashBytes(vram),
      registers: [...registers],
      pc: lastPc,
      sp: cpu.sp,
      instruction: instruction.text,
      checkpointAddress,
      checkpointHit,
      framesRun,
      width: framebuffer.width,
      height: framebuffer.height
    };
  } finally {
    core.destroy();
  }
}

const options = parseArguments(process.argv.slice(2));
const [bios, rom, symbols] = await Promise.all([
  readFile(options.bios),
  readFile(options.rom),
  options.symbols ? readFile(options.symbols, "utf8") : ""
]);
const checkpointAddress = resolveCheckpointAddress(symbols, options.checkpoint);

const first = await runOnce(options, bios, rom, checkpointAddress);
const second = await runOnce(options, bios, rom, checkpointAddress);

if (JSON.stringify(first) !== JSON.stringify(second)) {
  console.error("GearColeco web core determinism failure.");
  console.error({ first, second });
  process.exit(1);
}

console.log("GearColeco web core smoke test PASS");
console.log(JSON.stringify(first, null, 2));

