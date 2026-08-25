export const OPTIMIZATION_LEVELS = {
  auto: {
    label: "Auto",
    risk: "◇",
    description: "Recommended automatic profile.",
    passes: []
  },
  off: {
    label: "Off",
    risk: "·",
    description: "No optimization. Best for ASM debugging.",
    passes: []
  },
  safe: {
    label: "Safe ◇",
    risk: "◇",
    description: "Conservative local optimization.",
    passes: ["peephole"]
  },
  balanced: {
    label: "Balanced ▲",
    risk: "▲",
    description: "Recommended size and safety balance.",
    passes: ["peephole", "branchShortening"]
  },
  aggressive: {
    label: "Aggressive ⚠",
    risk: "⚠",
    description: "More optimization. Verify the ROM.",
    passes: ["peephole", "branchShortening", "aZeroToXor", "rstVectors"]
  },
  experimental: {
    label: "Experimental ☢",
    risk: "☢",
    description: "Maximum optimization. Test carefully.",
    passes: ["peephole", "branchShortening", "deadCode", "aZeroToXor", "rstVectors", "inlineRoutines", "stripIxFrames"]
  }
};

export function normalizeOptimizationLevel(value) {
  switch (String(value || "").toLowerCase()) {
    case "on":
      return "aggressive";
    case "off":
      return "off";
    case "safe":
    case "balanced":
    case "aggressive":
    case "experimental":
    case "auto":
      return String(value).toLowerCase();
    default:
      return "auto";
  }
}

export function sourceHintsTinySound(sourceText) {
  const text = sourceText || "";
  return /\bsndtiny_[12]\b/i.test(text)
    || /\bSPECIAL-04\b/i.test(text)
    || /include\s+"[^"]*(?:snddata_tiny|tinymusic|sndtiny|tiny_sound|tiny[-_ ]?music)[^"]*"/i.test(text);
}

export function getOptimizationProfile(level, sourceText = "") {
  const normalized = normalizeOptimizationLevel(level);
  const hasTinySound = sourceHintsTinySound(sourceText || "");
  if (normalized === "off") {
    return {
      requestedLevel: normalized,
      effectiveLevel: "off",
      optimizerEnabled: false,
      optimizerConfig: null,
      note: "optimizer off"
    };
  }
  if (normalized === "auto") {
    const effectiveLevel = hasTinySound ? "safe" : "balanced";
    const effectiveProfile = getOptimizationProfile(effectiveLevel, sourceText);
    return {
      ...effectiveProfile,
      requestedLevel: normalized,
      note: hasTinySound
        ? "auto → Safe ◇ for tiny sound"
        : "auto → Balanced ▲"
    };
  }
  const optimizerConfig = {
    peephole: true,
    deadCode: normalized === "experimental",
    branchShortening: normalized === "balanced" || normalized === "aggressive" || normalized === "experimental",
    localValueReuse: normalized === "balanced" || normalized === "aggressive" || normalized === "experimental",
    blockCopyBcZeroReuse: normalized === "balanced" || normalized === "aggressive" || normalized === "experimental",
    deadCp0Removal: normalized === "balanced" || normalized === "aggressive" || normalized === "experimental",
    deadOrARemoval: normalized === "balanced" || normalized === "aggressive" || normalized === "experimental",
    aZeroToXor: normalized === "aggressive" || normalized === "experimental",
    flagLivenessPeepholes: normalized === "balanced" || normalized === "aggressive" || normalized === "experimental",
    rstVectors: normalized === "aggressive" || normalized === "experimental",
    speculativeValueReuse: normalized === "aggressive" || normalized === "experimental",
    hazardousValueReuse: normalized === "experimental",
    inlineRoutines: normalized === "experimental",
    stripIxFrames: normalized === "experimental"
  };
  const levelInfo = OPTIMIZATION_LEVELS[normalized] || OPTIMIZATION_LEVELS.safe;
  return {
    requestedLevel: normalized,
    effectiveLevel: normalized,
    optimizerEnabled: true,
    optimizerConfig,
    note: `${levelInfo.label}`
  };
}

