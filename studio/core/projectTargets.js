const KB = 1024;

export const AMY_TARGETS = Object.freeze({
  "colecovision-cartridge": Object.freeze({
    id: "colecovision-cartridge",
    machine: "colecovision",
    artifact: "rom",
    extension: ".rom",
    memoryProfile: "colecovision-cartridge",
    capabilities: ["cartridge", "os7", "controller", "vdp", "psg", "rom-assets"]
  }),
  "colecovision-megacart": Object.freeze({
    id: "colecovision-megacart",
    machine: "colecovision",
    artifact: "megacart",
    extension: ".rom",
    memoryProfile: "colecovision-megacart",
    capabilities: ["cartridge", "megacart", "os7", "controller", "vdp", "psg", "rom-assets"]
  }),
  "adam-native-program": Object.freeze({
    id: "adam-native-program",
    machine: "adam",
    artifact: "program",
    extension: ".bin",
    memoryProfile: "adam-eos-application",
    capabilities: ["adam", "eos", "adamnet", "adam-keyboard", "controller", "vdp", "psg", "file-io"]
  }),
  "adam-disk": Object.freeze({
    id: "adam-disk",
    machine: "adam",
    artifact: "disk",
    extension: ".dsk",
    memoryProfile: null,
    capabilities: ["adam", "eos-media", "multiple-outputs", "writable-media"]
  }),
  "adam-data-pack": Object.freeze({
    id: "adam-data-pack",
    machine: "adam",
    artifact: "data-pack",
    extension: ".ddp",
    memoryProfile: null,
    capabilities: ["adam", "eos-media", "multiple-outputs", "writable-media"]
  })
});

export const AMY_MEMORY_MAPS = Object.freeze({
  "colecovision-cartridge": Object.freeze({
    id: "colecovision-cartridge",
    addressSpace: 0x10000,
    regions: Object.freeze([
      { name: "hardware-and-os7", start: 0x0000, endExclusive: 0x6000, access: "mapped" },
      { name: "console-ram-mirrors", start: 0x6000, endExclusive: 0x8000, access: "ram" },
      { name: "cartridge-rom", start: 0x8000, endExclusive: 0x10000, access: "rom" }
    ])
  }),
  "colecovision-megacart": Object.freeze({
    id: "colecovision-megacart",
    addressSpace: 0x10000,
    regions: Object.freeze([
      { name: "hardware-and-os7", start: 0x0000, endExclusive: 0x6000, access: "mapped" },
      { name: "console-ram-mirrors", start: 0x6000, endExclusive: 0x8000, access: "ram" },
      { name: "fixed-final-bank", start: 0x8000, endExclusive: 0xC000, access: "rom" },
      { name: "switchable-16k-bank", start: 0xC000, endExclusive: 0x10000, access: "banked-rom" },
      { name: "mapper-read-window", start: 0xFFC0, endExclusive: 0x10000, access: "mapper" }
    ])
  }),
  "adam-eos-application": Object.freeze({
    id: "adam-eos-application",
    addressSpace: 0x10000,
    programStart: 0x0100,
    programEndExclusive: 0xD390,
    stackTop: 0xD38F,
    requiredMioc: 0x01,
    regions: Object.freeze([
      { name: "vectors-and-system-low", start: 0x0000, endExclusive: 0x0100, access: "reserved" },
      { name: "application-main-ram", start: 0x0100, endExclusive: 0xD390, access: "ram" },
      {
        name: "mutable-eos-copy",
        start: 0xD390,
        endExclusive: 0x10000,
        access: "ram",
        initializedFrom: "eos-rom"
      }
    ])
  }),
  "adam-os7-eos-drivers": Object.freeze({
    id: "adam-os7-eos-drivers",
    addressSpace: 0x10000,
    programStart: 0x2000,
    programEndExclusive: 0xF400,
    stackTop: 0xF3FF,
    requiredMioc: 0x03,
    regions: Object.freeze([
      { name: "os7-rom", start: 0x0000, endExclusive: 0x2000, access: "rom" },
      { name: "application-main-ram", start: 0x2000, endExclusive: 0xF400, access: "ram" },
      {
        name: "mutable-eos-device-services",
        start: 0xF400,
        endExclusive: 0x10000,
        access: "ram",
        initializedFrom: "eos-rom",
        note: "Reduced EOS footprint for software that retains only required device/file services."
      }
    ])
  }),
  "adam-eos-boot-block": Object.freeze({
    id: "adam-eos-boot-block",
    addressSpace: 0x10000,
    programStart: 0xC800,
    programEndExclusive: 0xCC00,
    stackTop: 0x2FF0,
    regions: Object.freeze([
      { name: "boot-block", start: 0xC800, endExclusive: 0xCC00, access: "ram" },
      { name: "eos-entry-points", start: 0xFC30, endExclusive: 0xFE00, access: "firmware" }
    ])
  })
});

// MIOC bits 0-1 select the lower 32 KB; bits 2-3 select the upper 32 KB.
// Firmware copied into main RAM is RAM after the copy, even if its contents
// originated in EOS, OS-7, or SmartWriter ROM.
export const ADAM_MIOC_CONFIGURATIONS = Object.freeze({
  lower: Object.freeze({
    0: Object.freeze([
      { start: 0x0000, endExclusive: 0x6000, source: "smartwriter-rom", writable: false },
      { start: 0x6000, endExclusive: 0x8000, source: "smartwriter-or-eos-rom", writable: false }
    ]),
    1: Object.freeze([{ start: 0x0000, endExclusive: 0x8000, source: "main-ram", writable: true }]),
    2: Object.freeze([{ start: 0x0000, endExclusive: 0x8000, source: "expansion-ram", writable: true }]),
    3: Object.freeze([
      { start: 0x0000, endExclusive: 0x2000, source: "os7-rom", writable: false },
      { start: 0x2000, endExclusive: 0x8000, source: "main-ram", writable: true }
    ])
  }),
  upper: Object.freeze({
    0: Object.freeze([{ start: 0x8000, endExclusive: 0x10000, source: "main-ram", writable: true }]),
    1: Object.freeze([{
      start: 0x8000,
      endExclusive: 0x10000,
      source: "expansion-rom",
      writable: false,
      emulatorFallback: "open-bus"
    }]),
    2: Object.freeze([{ start: 0x8000, endExclusive: 0x10000, source: "expansion-ram", writable: true }]),
    3: Object.freeze([{ start: 0x8000, endExclusive: 0x10000, source: "cartridge", writable: false }])
  })
});

export function decodeAdamMioc(value, { eosSelected = true } = {}) {
  const mioc = Number(value) & 0x0F;
  const lower = ADAM_MIOC_CONFIGURATIONS.lower[mioc & 0x03].map((region) => ({ ...region }));
  if ((mioc & 0x03) === 0) {
    lower[1].source = eosSelected ? "eos-rom" : "smartwriter-rom";
  }
  const upper = ADAM_MIOC_CONFIGURATIONS.upper[(mioc >> 2) & 0x03].map((region) => ({ ...region }));
  return { mioc, lower, upper, regions: [...lower, ...upper] };
}

const SOURCE_KINDS = new Set(["amy", "asm", "asset"]);
const OUTPUT_KINDS = new Set(["boot", "program", "overlay", "data", "fixed-bank", "switchable-bank"]);

export function getAmyTarget(id) {
  return AMY_TARGETS[id] || null;
}

export function targetHasCapability(targetId, capability) {
  return !!getAmyTarget(targetId)?.capabilities.includes(capability);
}

export function getTargetOptimizationPolicy(targetId) {
  const target = getAmyTarget(targetId);
  if (!target) return null;
  const cartridge = targetHasCapability(targetId, "cartridge");
  const banked = targetHasCapability(targetId, "megacart");
  return {
    z80Peephole: true,
    controlFlow: true,
    deadCode: true,
    jumpShortening: true,
    cartridgeRstVectors: cartridge,
    assumeSingleLogicalAddressSpace: !banked,
    requireBankAwareSymbols: banked,
    packageColecoHeader: cartridge,
    packageAdamMedia: targetHasCapability(targetId, "eos-media")
  };
}

export function resolveAmyBuildContext(project = {}, manifest = null) {
  const projectPlatform = String(project?.target?.platform || "").trim();
  const manifestPlatform = String(manifest?.target?.platform || "").trim();
  const platform = manifestPlatform || projectPlatform || "colecovision-cartridge";
  const target = getAmyTarget(platform);
  if (!target) throw new Error(`Unknown Amy build target '${platform}'.`);

  const warnings = [];
  const requestedMedium = String(manifest?.target?.medium || project?.target?.medium || "").trim().toLowerCase();
  const adamMediaTarget = target.id === "adam-native-program" || target.id === "adam-disk" || target.id === "adam-data-pack";
  const medium = adamMediaTarget
    ? (target.id === "adam-data-pack" || requestedMedium === "ddp" || requestedMedium === "data-pack" ? "ddp" : "dsk")
    : null;
  if (projectPlatform && manifestPlatform && projectPlatform !== manifestPlatform) {
    warnings.push(`Project target '${projectPlatform}' is overridden by manifest target '${manifestPlatform}'.`);
  }
  const memoryProfile = String(
    manifest?.memoryProfile
      || target.memoryProfile
      || project?.memoryProfile
      || ""
  ).trim() || null;
  const memoryMap = memoryProfile ? (AMY_MEMORY_MAPS[memoryProfile] || null) : null;
  if (memoryProfile && !memoryMap && memoryProfile !== "colecovision_legacy_sdcc") {
    warnings.push(`Target '${platform}' uses unknown memory profile '${memoryProfile}'.`);
  }

  const capabilities = new Set(target.capabilities);
  const hardware = new Set([
    ...(Array.isArray(project?.target?.hardware) ? project.target.hardware : []),
    ...(Array.isArray(manifest?.target?.hardware) ? manifest.target.hardware : [])
  ].map((value) => String(value).trim().toLowerCase()));
  if (hardware.has("sgm") || hardware.has("sgm1")) {
    for (const capability of ["sgm", "sgm-ay", "sgm-ram-upper", "sgm-ram-lower"]) capabilities.add(capability);
  }
  if (hardware.has("adam-sound-enhancer")) {
    capabilities.add("sgm-ay");
  }
  if (memoryProfile === "adam-eos-application" || memoryProfile === "adam-eos-boot-block") {
    for (const capability of ["adam", "eos", "adamnet", "adam-keyboard", "controller", "vdp", "psg", "file-io"]) {
      capabilities.add(capability);
    }
    capabilities.delete("os7");
  } else if (memoryProfile === "adam-os7-eos-drivers") {
    for (const capability of ["adam", "os7", "eos", "adamnet", "adam-keyboard", "controller", "vdp", "psg", "file-io"]) {
      capabilities.add(capability);
    }
  } else if (memoryProfile === "colecovision_legacy_sdcc" && target.machine === "adam") {
    for (const capability of ["os7", "controller", "vdp", "psg"]) capabilities.add(capability);
    capabilities.delete("eos");
  }

  return Object.freeze({
    platform: target.id,
    machine: target.machine,
    artifact: target.artifact,
    extension: target.extension,
    medium,
    memoryProfile,
    memoryMap,
    capabilities: Object.freeze([...capabilities]),
    optimizationPolicy: Object.freeze(getTargetOptimizationPolicy(target.id)),
    warnings: Object.freeze(warnings)
  });
}

export function getBuildContextDefines(context) {
  const capabilities = new Set(context?.capabilities || []);
  const defines = ["AMY_TARGET_" + String(context?.machine || "colecovision").toUpperCase()];
  if (capabilities.has("os7")) defines.push("AMY_HAS_OS7");
  if (capabilities.has("eos")) defines.push("AMY_HAS_EOS");
  if (capabilities.has("megacart")) defines.push("AMY_HAS_MEGACART");
  if (capabilities.has("adamnet")) defines.push("AMY_HAS_ADAMNET");
  if (capabilities.has("file-io")) defines.push("AMY_HAS_FILE_IO");
  if (capabilities.has("sgm")) defines.push("AMY_HAS_SGM");
  if (capabilities.has("sgm-ay")) defines.push("AMY_HAS_SGM_AY");
  return Object.freeze(defines);
}

export function validateAmyBuildProject(project) {
  const errors = [];
  const warnings = [];
  const target = getAmyTarget(project?.target?.platform);
  if (!target) {
    errors.push(`Unknown target '${project?.target?.platform || ""}'.`);
    return { ok: false, errors, warnings };
  }

  const outputs = Array.isArray(project.outputs) ? project.outputs : [];
  if (targetHasCapability(target.id, "multiple-outputs")) {
    if (!outputs.length) errors.push(`${target.id} requires at least one output.`);
    if (!outputs.some((output) => output.type === "boot")) errors.push(`${target.id} requires one boot output.`);
  } else if (target.id !== "colecovision-megacart" && outputs.length > 1) {
    errors.push(`${target.id} produces one program image, not multiple media files.`);
  }

  const names = new Set();
  let bootCount = 0;
  for (const output of outputs) {
    const name = String(output?.name || "").trim().toUpperCase();
    if (!name) errors.push("Every output requires a name.");
    else if (names.has(name)) errors.push(`Duplicate output name '${name}'.`);
    else names.add(name);
    if (!OUTPUT_KINDS.has(output?.type)) errors.push(`Output '${name}' has invalid type '${output?.type}'.`);
    if (output?.type === "boot") bootCount++;
    const sources = Array.isArray(output?.sources) ? output.sources : [];
    if (!sources.length) errors.push(`Output '${name}' requires at least one source.`);
    for (const source of sources) {
      const kind = typeof source === "string" ? inferSourceKind(source) : source?.kind;
      const path = typeof source === "string" ? source : source?.path;
      if (!path) errors.push(`Output '${name}' contains a source without a path.`);
      if (!SOURCE_KINDS.has(kind)) errors.push(`Output '${name}' source '${path || ""}' has invalid kind '${kind}'.`);
    }
  }
  if (bootCount > 1) errors.push("ADAM media can have only one boot output.");

  if (target.id === "colecovision-megacart") {
    const fixed = outputs.filter((output) => output?.type === "fixed-bank");
    if (fixed.length !== 1) errors.push("MegaCart requires exactly one fixed-bank output.");
    const banks = new Set();
    const bankCount = Number(project?.target?.romSizeKb) / 16;
    for (const output of outputs.filter((entry) => entry?.type === "switchable-bank")) {
      const bank = Number(output.bank);
      if (!Number.isInteger(bank) || bank < 1 || bank >= bankCount) {
        errors.push(`MegaCart output '${output.name || ""}' bank must be between 1 and ${bankCount - 1}.`);
      } else if (banks.has(bank)) {
        errors.push(`Duplicate MegaCart logical bank ${bank}.`);
      } else banks.add(bank);
    }
  }

  const sizeKb = Number(project?.target?.romSizeKb);
  if (target.id === "colecovision-megacart" && ![64, 128, 256, 512, 1024].includes(sizeKb)) {
    errors.push("MegaCart romSizeKb must be 64, 128, 256, 512, or 1024.");
  }
  if (target.id !== "colecovision-megacart" && Number.isFinite(sizeKb)) {
    warnings.push(`romSizeKb is ignored by ${target.id}.`);
  }

  return { ok: errors.length === 0, errors, warnings, target };
}

export function inferSourceKind(path) {
  const lower = String(path || "").toLowerCase();
  if (lower.endsWith(".amy") || lower.endsWith(".alexis")) return "amy";
  if (lower.endsWith(".asm") || lower.endsWith(".inc")) return "asm";
  return "asset";
}

export function estimateTargetCapacity(targetId, options = {}) {
  if (targetId === "colecovision-cartridge") return Number(options.romSizeKb || 32) * KB;
  if (targetId === "colecovision-megacart") return Number(options.romSizeKb || 128) * KB;
  if (targetId === "adam-disk") return Number(options.blockCount || 160) * KB;
  if (targetId === "adam-data-pack") return Number(options.blockCount || 256) * KB;
  return AMY_MEMORY_MAPS["adam-eos-application"].programEndExclusive - AMY_MEMORY_MAPS["adam-eos-application"].programStart;
}
