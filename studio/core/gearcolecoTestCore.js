const DEFAULT_MODULE_URL = new URL(
  "../vendor/gearcoleco-test-core/gearcoleco-test-core.js?v=20260802-z80-explorer",
  import.meta.url
);

export const GEARCOLECO_TEST_REGION = Object.freeze({
  NTSC: 0,
  PAL: 1,
  AUTO: -1
});

export function detectColecoRegionFromBios(bytes) {
  const bios = requireBytes(bytes, "BIOS");
  return bios[0x69] === 0x32
    ? GEARCOLECO_TEST_REGION.PAL
    : GEARCOLECO_TEST_REGION.NTSC;
}

export const GEARCOLECO_TEST_INPUT = Object.freeze({
  UP: 1 << 0,
  DOWN: 1 << 1,
  LEFT: 1 << 2,
  RIGHT: 1 << 3,
  FIRE_RIGHT: 1 << 4,
  FIRE_LEFT: 1 << 5,
  KEYPAD_2: 1 << 6,
  KEYPAD_1: 1 << 7,
  KEYPAD_ASTERISK: 1 << 8,
  KEYPAD_HASH: 1 << 9,
  KEYPAD_3: 1 << 10,
  KEYPAD_4: 1 << 11,
  KEYPAD_5: 1 << 12,
  KEYPAD_6: 1 << 13,
  KEYPAD_7: 1 << 14,
  KEYPAD_8: 1 << 15,
  KEYPAD_0: 1 << 16,
  KEYPAD_9: 1 << 17,
  BLUE: 1 << 18,
  PURPLE: 1 << 19
});

function requireBytes(value, label) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError(`${label} must be an ArrayBuffer or Uint8Array.`);
}

export class GearcolecoTestCore {
  constructor(module) {
    this.module = module;
    this.destroyed = false;
    this.biosRegion = GEARCOLECO_TEST_REGION.NTSC;
    this.region = GEARCOLECO_TEST_REGION.NTSC;
  }

  static async create({ seed = 0, moduleUrl = DEFAULT_MODULE_URL } = {}) {
    const imported = await import(moduleUrl.href || String(moduleUrl));
    const factory = imported.default;
    const module = await factory({
      locateFile(path) {
        return new URL(path, moduleUrl).href;
      }
    });
    if (module._gcw_create(seed >>> 0) !== 1) {
      throw new Error("GearColeco test core initialization failed.");
    }
    return new GearcolecoTestCore(module);
  }

  assertAlive() {
    if (this.destroyed) throw new Error("GearColeco test core is destroyed.");
  }

  withInputBytes(value, label, callback) {
    this.assertAlive();
    const bytes = requireBytes(value, label);
    const pointer = this.module._malloc(bytes.byteLength || 1);
    try {
      this.module.HEAPU8.set(bytes, pointer);
      return callback(pointer, bytes.byteLength);
    } finally {
      this.module._free(pointer);
    }
  }

  withOutputBytes(size, callback) {
    this.assertAlive();
    const pointer = this.module._malloc(size || 1);
    try {
      const written = callback(pointer, size) >>> 0;
      return this.module.HEAPU8.slice(pointer, pointer + written);
    } finally {
      this.module._free(pointer);
    }
  }

  loadBios(bytes) {
    const bios = requireBytes(bytes, "BIOS");
    this.biosRegion = detectColecoRegionFromBios(bios);
    return this.withInputBytes(bios, "BIOS", (pointer, size) => {
      if (this.module._gcw_load_bios(pointer, size) !== 1) {
        throw new Error(`GearColeco rejected BIOS (${size} bytes; expected 8192).`);
      }
      return true;
    });
  }

  loadRom(bytes, { region = GEARCOLECO_TEST_REGION.AUTO } = {}) {
    const resolvedRegion = region === GEARCOLECO_TEST_REGION.AUTO ? this.biosRegion : region;
    if (resolvedRegion !== GEARCOLECO_TEST_REGION.NTSC && resolvedRegion !== GEARCOLECO_TEST_REGION.PAL) {
      throw new RangeError(`Invalid GearColeco region ${region}.`);
    }
    return this.withInputBytes(bytes, "ROM", (pointer, size) => {
      if (this.module._gcw_load_rom(pointer, size, resolvedRegion) !== 1) {
        throw new Error(`GearColeco rejected ROM (${size} bytes).`);
      }
      this.region = this.module._gcw_get_region() | 0;
      return true;
    });
  }

  getRegion() {
    this.assertAlive();
    this.region = this.module._gcw_get_region() | 0;
    return this.region;
  }

  getRegionName() {
    return this.getRegion() === GEARCOLECO_TEST_REGION.PAL ? "PAL" : "NTSC";
  }

  getFramesPerSecond() {
    return this.getRegion() === GEARCOLECO_TEST_REGION.PAL ? 50 : 60;
  }

  getCyclesPerFrame() {
    return this.getRegion() === GEARCOLECO_TEST_REGION.PAL ? 228 * 313 : 228 * 262;
  }

  reset({ preserveRam = false } = {}) {
    this.assertAlive();
    if (this.module._gcw_reset(preserveRam ? 1 : 0) !== 1) {
      throw new Error("GearColeco reset failed.");
    }
  }

  runFrame() {
    this.assertAlive();
    const result = this.module._gcw_run_frame();
    if (result < 0) throw new Error("GearColeco frame execution failed.");
    return {
      breakpointHit: result === 1,
      pc: this.module._gcw_get_pc() & 0xFFFF
    };
  }

  stepInstruction() {
    this.assertAlive();
    const result = this.module._gcw_step_instruction();
    if (result < 0) throw new Error("GearColeco instruction step failed.");
    return {
      breakpointHit: false,
      pc: this.module._gcw_get_pc() & 0xFFFF,
      interruptType: this.module._gcw_get_last_step_interrupt() | 0
    };
  }


  beginRoutineProfile({ target, entrySp, returnAddress, exitAddresses = [] }) {
    this.assertAlive();
    const exits = Uint16Array.from(exitAddresses, (address) => address & 0xFFFF);
    return this.withInputBytes(exits, "profile exits", (pointer) => {
      if (this.module._gcw_profile_begin(
        target.start >>> 0,
        target.end >>> 0,
        entrySp & 0xFFFF,
        returnAddress & 0xFFFF,
        pointer,
        exits.length
      ) !== 1) {
        throw new Error("GearColeco could not start routine profiling.");
      }
      return true;
    });
  }

  runRoutineProfileBatch(maxInstructions = 100000) {
    this.assertAlive();
    const status = this.module._gcw_profile_run_batch(maxInstructions >>> 0);
    if (status < 0) {
      if (status === -2) throw new Error("Profiler clock discontinuity detected; sample discarded.");
      throw new Error("GearColeco native routine profiling failed.");
    }
    const pointer = this.module._malloc(13 * 4);
    try {
      if (this.module._gcw_profile_get_results(pointer, 13) !== 13) {
        throw new Error("Could not read GearColeco routine profile results.");
      }
      const words = new Uint32Array(this.module.HEAPU8.buffer, pointer, 13).slice();
      const wide = (lowIndex) => words[lowIndex] + words[lowIndex + 1] * 0x100000000;
      const completionKind = words[11] === 1 ? "return" : words[11] === 2 ? "transfer" : "";
      return {
        complete: status === 1,
        active: words[12] === 1,
        instructions: words[0],
        inclusiveCycles: wide(1),
        inRangeCycles: wide(3),
        interruptCycles: wide(5),
        nmiCycles: wide(7),
        irqCycles: wide(9),
        completionKind
      };
    } finally {
      this.module._free(pointer);
    }
  }

  cancelRoutineProfile() {
    this.assertAlive();
    this.module._gcw_profile_cancel();
  }

  setControllerMask(controller, mask) {
    this.assertAlive();
    if (this.module._gcw_set_controller_mask(controller, mask >>> 0) !== 1) {
      throw new RangeError(`Invalid GearColeco controller index ${controller}.`);
    }
  }

  setSpinner(controller, movement) {
    this.assertAlive();
    if (this.module._gcw_set_spinner(controller, movement | 0) !== 1) {
      throw new RangeError(`Invalid GearColeco spinner index ${controller}.`);
    }
  }

  saveState() {
    this.assertAlive();
    const size = this.module._gcw_save_state_size() >>> 0;
    if (!size) throw new Error("GearColeco could not determine save-state size.");
    const state = this.withOutputBytes(size, (pointer, capacity) => {
      return this.module._gcw_save_state(pointer, capacity);
    });
    if (state.byteLength !== size) {
      throw new Error(`GearColeco save-state size changed (${size} -> ${state.byteLength}).`);
    }
    return state;
  }

  loadState(bytes, { controllerMasks = [0, 0] } = {}) {
    return this.withInputBytes(bytes, "save state", (pointer, size) => {
      if (this.module._gcw_load_state(pointer, size) !== 1) {
        throw new Error("GearColeco rejected the save state.");
      }
      for (let controller = 0; controller < 2; ++controller) {
        const mask = controllerMasks[controller] >>> 0;
        if (this.module._gcw_sync_controller_mask(controller, mask) !== 1) {
          throw new Error(`Could not restore controller ${controller} tracking.`);
        }
      }
      return true;
    });
  }

  getFramebuffer() {
    const framebuffer = this.getFramebufferView();
    return { ...framebuffer, pixels: framebuffer.pixels.slice() };
  }

  getFramebufferView() {
    this.assertAlive();
    const width = this.module._gcw_get_framebuffer_width() | 0;
    const height = this.module._gcw_get_framebuffer_height() | 0;
    const pointer = this.module._gcw_get_framebuffer() >>> 0;
    const pixels = this.module.HEAPU16.subarray(
      pointer >>> 1,
      (pointer >>> 1) + width * height
    );
    return { width, height, format: "rgb565", pixels };
  }

  getAudioFrame() {
    this.assertAlive();
    const sampleRate = this.module._gcw_get_audio_sample_rate() | 0;
    const sampleCount = this.module._gcw_get_audio_sample_count() | 0;
    const pointer = this.module._gcw_get_audio_buffer() >>> 0;
    const samples = this.module.HEAP16.slice(
      pointer >>> 1,
      (pointer >>> 1) + sampleCount
    );
    return {
      sampleRate,
      channels: 2,
      frameCount: sampleCount >>> 1,
      samples
    };
  }
  getPc() {
    this.assertAlive();
    return this.module._gcw_get_pc() & 0xFFFF;
  }

  getSp() {
    this.assertAlive();
    return this.module._gcw_get_sp() & 0xFFFF;
  }

  
  getCpuState() {
    const bytes = this.withOutputBytes(32, (pointer) => {
      return this.module._gcw_get_cpu_state(pointer, 16) * 2;
    });
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const word = (index) => view.getUint16(index * 2, true);
    const flags = word(14);
    return {
      af: word(0), bc: word(1), de: word(2), hl: word(3),
      af2: word(4), bc2: word(5), de2: word(6), hl2: word(7),
      ix: word(8), iy: word(9), sp: word(10), pc: word(11), wz: word(12),
      i: word(13) >>> 8, r: word(13) & 0xFF,
      interruptMode: flags & 3,
      iff1: Boolean(flags & 0x0100),
      iff2: Boolean(flags & 0x0200),
      halted: Boolean(flags & 0x0400)
    };
  }

  disassemble(address) {
    const bytes = this.withOutputBytes(73, (pointer, capacity) => {
      return this.module._gcw_disassemble(address & 0xFFFF, pointer, capacity);
    });
    const size = bytes[0] || 1;
    let end = 9;
    while (end < bytes.length && bytes[end]) end += 1;
    return {
      address: address & 0xFFFF,
      size,
      jump: Boolean(bytes[1]),
      opcodes: Array.from(bytes.slice(2, 2 + Math.min(size, 7))),
      text: new TextDecoder().decode(bytes.slice(9, end)).replace(/\{[^}]*\}/g, "")
    };
  }
getMasterClockCycles() {
    this.assertAlive();
    const pointer = this.module._malloc(8);
    try {
      if (this.module._gcw_get_master_clock(pointer, 2) !== 2) {
        throw new Error("Could not read GearColeco master clock.");
      }
      const view = new DataView(this.module.HEAPU8.buffer, pointer, 8);
      const low = view.getUint32(0, true);
      const high = view.getUint32(4, true);
      return high * 0x100000000 + low;
    } finally {
      this.module._free(pointer);
    }
  }

  readRam(address, size) {
    return this.withOutputBytes(size, (pointer, capacity) => {
      return this.module._gcw_read_ram(address & 0xFFFF, pointer, capacity);
    });
  }

  readVram(address, size) {
    return this.withOutputBytes(size, (pointer, capacity) => {
      return this.module._gcw_read_vram(address & 0x3FFF, pointer, capacity);
    });
  }

  getVdpRegisters() {
    return this.withOutputBytes(8, (pointer, capacity) => {
      return this.module._gcw_get_vdp_registers(pointer, capacity);
    });
  }

  setExecuteBreakpoint(address) {
    this.assertAlive();
    if (this.module._gcw_set_execute_breakpoint(address & 0xFFFF) !== 1) {
      throw new Error(`Could not set execute breakpoint at $${address.toString(16)}.`);
    }
  }

  clearExecuteBreakpoint(address) {
    this.assertAlive();
    this.module._gcw_clear_execute_breakpoint(address & 0xFFFF);
  }

  clearAllBreakpoints() {
    this.assertAlive();
    this.module._gcw_clear_all_breakpoints();
  }

  destroy() {
    if (this.destroyed) return;
    this.module._gcw_destroy();
    this.destroyed = true;
  }
}
