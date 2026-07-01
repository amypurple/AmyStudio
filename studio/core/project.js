import { renderAlexisRuntime } from "./alexisRuntime.js";
import { getSplitLibraryCatalog, resolveSelectedLibModulesDetailed } from "./libraryModules.js";
import { getRamLayout, buildColecoLegacyRuntimeMap } from "../ramLayouts.js";

export function pathToLabel(path) {
  const base = path.split("/").pop() || "asset";
  const cleaned = base.replace(/[^a-zA-Z0-9]+/g, "_");
  return `Asset_${cleaned}`.replace(/_+$/g, "");
}

function assetLabelForPath(path, assetDeclarations = []) {
  const normalizedPath = normalizeAsmIncludePath(path);
  const declared = assetDeclarations.find((asset) => normalizeAsmIncludePath(asset.path) === normalizedPath);
  if (declared?.name) return `Asset_${declared.name}`;
  return pathToLabel(normalizedPath);
}

function withRequiredAlexisLibs(project, libs, asmBody) {
  const resolved = new Set(libs || []);
  const sourceText = project.sourceText || "";
  if (project.memoryProfile === "colecovision_legacy_sdcc") {
    resolved.add("include/coleco_io.inc");
  }
  // Granular math module detection — only include what the program actually uses.
  const usesSqrt    = /\bAMY_U16_SQRT\b/.test(asmBody);
  const usesRandomU8 = /\bAMY_RANDOM_U8\b/.test(asmBody);
  const usesU32Zero = /\bAMY_U32_ZERO\b/.test(asmBody);
  const usesU32Copy = /\bAMY_U32_COPY\b/.test(asmBody);
  const usesU32Inc  = /\bAMY_U32_INC\b/.test(asmBody);
  const usesU32Add  = /\bAMY_U32_ADD\b/.test(asmBody);
  const usesU32Sub  = /\bAMY_U32_SUB\b/.test(asmBody);
  const usesU32Mul  = /\bAMY_U32_MUL\b/.test(asmBody);
  const usesU32Div  = /\bAMY_U32_DIV\b/.test(asmBody);
  const usesU16Div  = /\bAMY_(?:U16_DIV|I16_(?:DIV|MOD))\b/.test(asmBody);
  const usesFx      = /\bAMY_(?:FX8_8_ADD|FX8_8_SUB)\b/.test(asmBody);
  const usesFxMul   = /\bAMY_FX8_8_MUL\b/.test(asmBody);
  const usesFxDiv   = /\bAMY_FX8_8_DIV\b/.test(asmBody);
  const usesFx16Core = /\bAMY_FX16_16_(?:ADD|SUB|NEG|ABS)\b/.test(asmBody);
  const usesFx16MulHelpers = /\b(?:AMY_U_MULT32|AMY_U64_ADD|AMY_U8_MUL16|AMY_U16_MUL32_TO_TMP)\b/.test(asmBody);
  const usesFx16Mult = /\bAMY_FX16_16_MULT\b/.test(asmBody);
  const usesFx16Div = /\bAMY_FX16_16_DIV\b/.test(asmBody);
  const usesFx16Sqrt = /\bAMY_FX16_16_SQRT\b/.test(asmBody);
  const usesFx16Random = /\bAMY_FX16_16_RND\b/.test(asmBody);
  const usesFp5Core = /\bAMY_FP5_(?:ZERO_MEM|COPY_MEM|LOAD_MEM_TO_FPA1|STORE_FPA1_TO_MEM|LOAD_MEM_TO_FPA2|STORE_FPA2_TO_MEM|ABS_MEM|HALF_FPA2|U16_TO_FPA1|I16_TO_FPA1|U16_DE_TO_FPA1|I16_DE_TO_FPA1|LOAD_U16_MEM_TO_FPA1|LOAD_I16_MEM_TO_FPA1|LOAD_U16_MEM_TO_FPA2|LOAD_I16_MEM_TO_FPA2|COPY_FPA1_TO_FPA2|COPY_FPA2_TO_FPA1|FPA1|FPA2)\b/.test(asmBody);
  const usesFp5Random = /\bAMY_FP5_RND\b/.test(asmBody);
  const usesFp5BasicArith = /\bAMY_FP5_(?:ADD_FPA1_TO_FPA2|SUB_FPA1_FROM_FPA2|CMP_FPA1_FPA2)\b/.test(asmBody);
  const usesFp5Bridge = /\b(?:AMY_FP5_TO_FX16_16|AMY_FX16_16_TO_FP5|AMY_UFX16_16_TO_FP5)\b/.test(asmBody);
  const usesFp5FormatHelpers = /\bAMY_FP5_FMT_(?:CLEAR32_HL|CLEAR40_HL|SHIFT32_LEFT_HL|SHIFT32_RIGHT_HL|ADD_REM32_TO_TMP40|CMP_TMP40_DEN32|SUB_DEN32_FROM_TMP40|COPY_TMP40_TO_REM32|MASK_REM32|BUILD_DEN32)\b/.test(asmBody);
  const usesFp5FormatExact = /\b(?:AMY_FP5_TO_ASCII16|AMY_PRINT_FP5_AT)\b/.test(asmBody);
  const usesFp5Mul = /\bAMY_FP5_MUL_FPA1_FPA2\b/.test(asmBody);
  const usesFp5Div = /\bAMY_FP5_DIV_FPA1_FPA2\b/.test(asmBody);
  const usesFp5Sqrt = /\bAMY_FP5_SQRT_MEM\b/.test(asmBody);
  const usesFp5Trans = /\bAMY_FP5_(?:LOG_MEM|EXP_MEM)\b/.test(asmBody);
  const usesFormatWord   = /\bAMY_U16_TO_ASCII5\b/.test(asmBody);
  const usesFormatU8     = /\bAMY_(?:U8_TO_ASCII3|U8_TO_ASCII2)\b/.test(asmBody);
  const usesFormatI16    = /\bAMY_I16_TO_ASCII6\b/.test(asmBody);
  const usesFormatU32    = /\bAMY_U32_TO_ASCII10\b/.test(asmBody);
  const usesFormatI32    = /\bAMY_I32_TO_ASCII11\b/.test(asmBody);
  const usesFormatFx     = /\bAMY_(?:FX8_8_TO_ASCII6|SFX8_8_TO_ASCII7|FX8_8_FRAC_TO_HUNDREDTHS)\b/.test(asmBody);
  const usesFormatFx16   = /\bAMY_(?:FX16_16_TO_ASCII9|FX16_16_TO_ASCII11|FX16_16_FRAC_TO_HUNDREDTHS|FX16_16_FRAC_TO_TEN_THOUSANDTHS)\b/.test(asmBody);
  const usesFormatFp5    = /\bAMY_FP5_TO_ASCII16\b/.test(asmBody);
  const usesCompareU32   = /\bAMY_CMP_U32_MEM\b/.test(asmBody);
  const usesCompareS32   = /\bAMY_CMP_S32_MEM\b/.test(asmBody);
  const usesCompareSmall = /\bAMY_(?:CMP_U8|CMP_S8|CMP_U16|CMP_S16)\b/.test(asmBody);
  // Resolve dependencies
  const needsFormatWord = usesFormatWord || usesFormatI16 || usesFormatFx16 || usesFormatFp5 || usesFp5FormatExact;     // i16/fx16/fp5 exact format call AMY_U16_TO_ASCII5
  const needsFormatU8   = usesFormatU8 || usesFormatFx;        // fx calls AMY_U8_TO_ASCII3/2; i8 emits AMY_U8_TO_ASCII3 inline
  const needsFormatU8Fx = needsFormatU8 || usesFormatFx16;
  const needsFormatU32  = usesFormatU32 || usesFormatI32;      // i32 format call U32_TO_ASCII10
  const needsCompareU32 = usesCompareU32 || needsFormatU32;    // format_u32 calls CMP_U32_MEM
  const needsU32Copy    = usesU32Copy || needsFormatU32;         // format_u32/i32/fp5 call AMY_U32_COPY
  const needsU32Inc     = usesU32Inc || usesFormatI32;           // format_i32 calls AMY_U32_INC
  const needsU32Sub     = usesU32Sub || needsFormatU32;          // format_u32/i32/fp5 call AMY_U32_SUB
  // Emit in dependency order (u32/compare before format)
  if (usesRandomU8)    resolved.add("src/alexis_lib/coleco_random.asm");
  if (usesSqrt)         resolved.add("src/alexis_lib/coleco_math_sqrt.asm");
  if (usesU32Zero || usesFx16Div || usesFx16Sqrt || usesFormatFx16) resolved.add("src/alexis_lib/coleco_math_u32_zero.asm");
  if (usesFx16Sqrt)         resolved.add("src/alexis_lib/coleco_math_sqrt.asm");
  if (needsU32Copy || usesFormatFx16) resolved.add("src/alexis_lib/coleco_math_u32_copy.asm");
  if (needsU32Inc || usesFx16Div || usesFormatFx16 || usesFp5Div) resolved.add("src/alexis_lib/coleco_math_u32_inc.asm");
  if (usesU32Add || usesFx16Core || usesFx16Mult || usesFormatFx16) resolved.add("src/alexis_lib/coleco_math_u32_add.asm");
  if (usesU32Mul) resolved.add("src/alexis_lib/coleco_math_u32_mul.asm");
  if (needsU32Sub || usesFx16Core || usesFormatFx16 || usesU32Div) resolved.add("src/alexis_lib/coleco_math_u32_sub.asm");
  if (usesU32Div || usesFxDiv) resolved.add("src/alexis_lib/coleco_math_u32_div.asm");
  if (usesU16Div) resolved.add("src/alexis_lib/coleco_math_u16_div.asm");
  if (usesCompareSmall) resolved.add("src/alexis_lib/coleco_math_compare_small.asm");
  if (needsCompareU32 || usesFx16Div || usesFormatFx16) resolved.add("src/alexis_lib/coleco_math_compare_u32.asm");
  if (usesCompareS32)   resolved.add("src/alexis_lib/coleco_math_compare_s32.asm");
  if (usesFx)           resolved.add("src/alexis_lib/coleco_math_fx.asm");
  if (usesFxMul)        resolved.add("src/alexis_lib/coleco_math_fx_mul.asm");
  if (usesFxDiv)        resolved.add("src/alexis_lib/coleco_math_fx_div.asm");
  if (usesFx16Core || usesFx16Mult || usesFx16Div || usesFx16Sqrt || usesFx16Random || usesFormatFx16) resolved.add("src/alexis_lib/coleco_math_fx16_core.asm");
  if (usesFx16MulHelpers || usesFx16Mult || usesFormatFx16) resolved.add("src/alexis_lib/coleco_math_fx16_mul_helpers.asm");
  if (usesFx16Mult) resolved.add("src/alexis_lib/coleco_math_fx16_mult.asm");
  if (usesFx16Div) resolved.add("src/alexis_lib/coleco_math_fx16_div.asm");
  if (usesFx16Sqrt) resolved.add("src/alexis_lib/coleco_math_fx16_sqrt.asm");
  if (usesFx16Random) resolved.add("src/alexis_lib/coleco_math_fx16_random.asm");
  if (usesFp5Core || usesFp5BasicArith || usesFp5Bridge || usesFp5FormatHelpers || usesFp5FormatExact || usesFp5Mul || usesFp5Div || usesFp5Sqrt || usesFp5Trans) resolved.add("src/alexis_lib/coleco_math_fp5_core.asm");
  if (usesFp5Random)    resolved.add("src/alexis_lib/coleco_math_fp5_random.asm");
  if (usesFp5BasicArith || usesFp5Bridge || usesFp5FormatExact || usesFp5Trans) resolved.add("src/alexis_lib/coleco_math_fp5_basic_arith.asm");
  if (usesFp5Bridge || usesFp5FormatExact) resolved.add("src/alexis_lib/coleco_math_fp5_bridge.asm");
  if (usesFp5FormatHelpers || usesFp5Div) resolved.add("src/alexis_lib/coleco_math_fp5_format_helpers.asm");
  if (usesFp5FormatExact) resolved.add("src/alexis_lib/coleco_math_fp5_format_exact.asm");
  if (usesFp5Mul || usesFp5Trans) resolved.add("src/alexis_lib/coleco_math_fp5_mul.asm");
  if (usesFp5Mul || usesFp5Div || usesFp5Sqrt || usesFp5Trans) resolved.add("src/alexis_lib/coleco_math_fp5_div64.asm");
  if (usesFp5Div) resolved.add("src/alexis_lib/coleco_math_fp5_div.asm");
  if (usesFp5Sqrt) resolved.add("src/alexis_lib/coleco_math_fp5_sqrt.asm");
  if (usesFp5Trans) resolved.add("src/alexis_lib/coleco_math_fp5_trans.asm");
  if (needsFormatWord)  resolved.add("src/alexis_lib/coleco_math_format.asm");
  if (needsFormatU8Fx)  resolved.add("src/alexis_lib/coleco_math_format_u8.asm");
  if (usesFormatI16)    resolved.add("src/alexis_lib/coleco_math_format_i16.asm");
  if (needsFormatU32)   resolved.add("src/alexis_lib/coleco_math_format_u32.asm");
  if (usesFormatI32)    resolved.add("src/alexis_lib/coleco_math_format_i32.asm");
  if (usesFormatFx)     resolved.add("src/alexis_lib/coleco_math_format_fx.asm");
  if (usesFormatFx16)   resolved.add("src/alexis_lib/coleco_math_format_fx16.asm");
  return [...resolved];
}

function dedupeCoveredLibraryIncludes(paths) {
  const normalized = [...new Set((paths || []).map(normalizeAsmIncludePath))];
  const selected = new Set(normalized);
  const catalog = getSplitLibraryCatalog();
  const coveredChildren = new Set();

  for (const [umbrellaPath, modules] of Object.entries(catalog)) {
    const umbrella = normalizeAsmIncludePath(umbrellaPath);
    if (!selected.has(umbrella)) continue;
    for (const module of modules) {
      coveredChildren.add(normalizeAsmIncludePath(module.path));
    }
  }

  return normalized.filter((path) => !coveredChildren.has(path));
}

function expandCoveredLibrarySourcePaths(paths) {
  const normalized = [...new Set((paths || []).map(normalizeAsmIncludePath))];
  const expanded = new Set(normalized);
  const catalog = getSplitLibraryCatalog();

  for (const path of normalized) {
    const modules = catalog[path];
    if (!modules) continue;
    for (const module of modules) {
      expanded.add(normalizeAsmIncludePath(module.path));
    }
  }

  return [...expanded];
}

export function normalizeAsmIncludePath(path) {
  return path.replace(/\\/g, "/");
}

function decodeProjectFileBytes(projectFile) {
  const base64 = typeof projectFile?.base64 === "string" ? projectFile.base64 : "";
  if (!base64) return new Uint8Array();
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function formatInlineDbLines(bytes) {
  const lines = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = Array.from(bytes.slice(i, i + 16), (value) =>
      `$${value.toString(16).toUpperCase().padStart(2, "0")}`
    );
    lines.push(`    db ${chunk.join(",")}`);
  }
  if (!lines.length) lines.push("    db $00");
  return lines;
}

function buildLegacyInitInstructions(caps) {
  const lines = [];
  const runtimeMap = buildColecoLegacyRuntimeMap({
    ...caps,
    needsSoundState: caps.needsSound || caps.needsMusic
  });
  if (runtimeMap.addresses.no_nmi) {
    const clearSize = runtimeMap.lowRuntimeEnd - runtimeMap.addresses.no_nmi;
    if (clearSize > 0) {
    lines.push("        xor a");
    lines.push("        ld hl,NO_NMI");
    lines.push("        ld de,NO_NMI+1");
    lines.push(`        ld bc,$${(clearSize - 1).toString(16).toUpperCase().padStart(4, "0")}`);
    lines.push("        ld (hl),a");
    lines.push("        ldir");
    }
    if (caps.needsFrameCounter) {
      lines.push("        ld hl,AMY_FRAME_COUNTER");
      lines.push("        ld (hl),a");
      lines.push("        inc hl");
      lines.push("        ld (hl),a");
    }
    if (caps.needsTinySound) {
      lines.push("        ld hl,AMY_TINYSOUND_SLOT_1");
      lines.push("        ld de,AMY_TINYSOUND_SLOT_1+1");
      lines.push("        ld bc,$001F");
      lines.push("        ld (hl),a");
      lines.push("        ldir");
    }
    if (caps.needsMusic) {
      lines.push("        ld hl,AMY_NO_MUSIC_TRACK");
      lines.push("        ld de,AMY_MUSIC_POINTER");
      lines.push("        ld a,l");
      lines.push("        ld (de),a");
      lines.push("        inc de");
      lines.push("        ld a,h");
      lines.push("        ld (de),a");
    }
    if (caps.needsRandomSeed) {
      lines.push("        ld hl,$0033");
      lines.push("        ld ($73C8),hl");
    }
    if (caps.needsSound) {
      lines.push("        ld a,6");
      lines.push("        ld hl,AMY_SOUND_AREA_COUNT");
      lines.push("        ld (hl),a");
      lines.push("        ld hl,AMY_SOUND_TABLE_DUMMY");
      lines.push("        ld de,AMY_SOUND_TABLE_POINTER");
      lines.push("        ld a,l");
      lines.push("        ld (de),a");
      lines.push("        inc de");
      lines.push("        ld a,h");
      lines.push("        ld (de),a");
    }
  }
  if (caps.needsSound) {
    lines.push("        ld b,6");
    lines.push("        call SET_SOUND_TABLE");
  }
  return lines;
}

function injectSystemInitInline(asmBody, caps) {
  const lines = asmBody.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === "Start:");
  if (startIndex === -1) return asmBody;
  lines.splice(startIndex + 1, 0, ...buildLegacyInitInstructions(caps));
  return lines.join("\n");
}

function splitHeaderAndCodeIncludes(paths) {
  const headerIncludes = [];
  const codeIncludes = [];
  for (const path of paths) {
    const normalized = normalizeAsmIncludePath(path);
    if (/\.inc$/i.test(normalized)) headerIncludes.push(normalized);
    else codeIncludes.push(normalized);
  }
  return { headerIncludes, codeIncludes };
}

function inferRequiredCompressionIncludes(sourceText) {
  const codecToInclude = {
    zx0: "src/compression/zx0_vram.asm",
    zx7: "src/compression/zx7_vram.asm",
    dan1: "src/compression/dan1_vram.asm",
    dan2: "src/compression/dan2_vram.asm",
    dan3: "src/compression/dan3_vram.asm",
    mdkrle: "src/compression/mdkrle_vram.asm",
    rle: "src/compression/mdkrle_vram.asm",
    pletter: "src/compression/pletter_vram.asm",
    lzf: "src/compression/lzf_vram.asm",
    bitbuster: "src/compression/bitbuster_vram.asm"
  };
  const found = new Set();
  const pattern = /^\s*decompress\s+(zx0|zx7|dan1|dan2|dan3|mdkrle|pletter|lzf|bitbuster|rle)\s+[A-Za-z_][A-Za-z0-9_]*\s+to\s+vram\.(pattern|color|name)\s*$/gim;
  let match;
  while ((match = pattern.exec(sourceText)) !== null) {
    found.add(codecToInclude[match[1].toLowerCase()]);
  }
  const pictureComponentPattern = /^\s*(?:pattern|color|name)\s+from\s+"[^"]+"\s+codec\s+(zx0|zx7|dan1|dan2|dan3|mdkrle|pletter|lzf|bitbuster|rle)\s*$/gim;
  while ((match = pictureComponentPattern.exec(sourceText)) !== null) {
    found.add(codecToInclude[match[1].toLowerCase()]);
  }
  return [...found];
}

function sourceHintsTinySound(sourceText) {
  const text = sourceText || "";
  return /\bsndtiny_[12]\b/i.test(text)
    || /\bSPECIAL-04\b/i.test(text)
    || /include\s+"[^"]*(?:snddata_tiny|tinymusic|sndtiny|tiny_sound|tiny[-_ ]?music)[^"]*"/i.test(text);
}

function inferRuntimeCapabilities(project, asmBody) {
  const sourceText = project.sourceText || "";
  const usesSoundApi = /\bAMY_(SET_SOUND_TABLE|PLAY_SOUND|STOP_SOUND|MUTE_ALL)\b/.test(asmBody);
  const usesMusicApi = /\bAMY_(PLAY_SONG|UPDATE_MUSIC|STOP_SONG|NEXT_SONG)\b/.test(asmBody);
  const usesTinySound = /\bsndtiny_[12]\b/.test(asmBody) || sourceHintsTinySound(sourceText);
  const usesSprites = /\bAMY_(SET_SPRITES8X8|SET_SPRITES16X16|SET_SPRITES_SIMPLE|SET_SPRITES_DOUBLE|SET_SPRITE_COUNT|SET_SPRITE|HIDE_SPRITE|CLEAR_SPRITES|UPDATE_SPRITES)\b/.test(asmBody)
    || /\bsprites?\b/i.test(sourceText);
  const usesJoypad1 = /\bJOYPAD_1\b/.test(asmBody);
  const usesKeypad1 = /\bKEYPAD_1\b/.test(asmBody);
  const usesJoypad2 = /\bJOYPAD_2\b/.test(asmBody);
  const usesKeypad2 = /\bKEYPAD_2\b/.test(asmBody);
  const usesJoypadVars = usesJoypad1 || usesKeypad1 || usesJoypad2 || usesKeypad2;
  const usesSpinner = /\bAMY_(ENABLE_SPINNER|DISABLE_SPINNER|RESET_SPINNER1|RESET_SPINNER2|RESET_SPINNERS)\b/.test(asmBody)
    || /\bspinner\b/i.test(sourceText);
  const codeText = sourceText.split(/\r?\n/).map((line) => line.replace(/'.*$/, "")).join("\n");
  const usesFrameCounter =
    /\bread\s+frame\s+into\s+[A-Za-z_][A-Za-z0-9_]*\b/i.test(sourceText) ||
    /\bAMY_FRAME_COUNTER\b/.test(asmBody) ||
    /\bframe\b(?!\s+size)/i.test(codeText);
  const usesScreenOnNmi = /\bAMY_SCREEN_ON_NMI\b/.test(asmBody);
  const usesHalt = /^\s*halt\s*$/gim.test(asmBody);
  const usesVdpStatusShadow = /\b(?:VDP_STATUS|NMI_FLAG)\b/.test(asmBody) || /\bif\s+any\s+collision\s+(?:then\s+)?goto\b/i.test(sourceText);
  const usesRandom = /\bGET_RANDOM\b/.test(asmBody) || /\bAMY_RANDOM_U8\b/.test(asmBody) || /\brandom\b/i.test(sourceText);
  const needsSprites = usesSprites;
  const needsControllers = usesJoypadVars;
  const needsSpinner = usesSpinner;
  const needsFrameCounter = usesFrameCounter || usesTinySound;
  const needsVdpStatusShadow = usesVdpStatusShadow;
  const needsSound = usesSoundApi || usesMusicApi;
  const needsMusic = usesMusicApi;
  const needsTinySound = usesTinySound;
  const needsRandomSeed = usesRandom;
  const needsNmi = usesScreenOnNmi || usesHalt || needsControllers || needsSpinner || needsSound || needsFrameCounter || needsVdpStatusShadow;
  const needsNmiAckOnly = needsNmi && !needsControllers && !needsSound;
  return {
    needsSprites,
    needsControllers,
    needsSpinner,
    needsFrameCounter,
    needsVdpStatusShadow,
    needsSound,
    needsMusic,
    needsTinySound,
    needsRandomSeed,
    needsNmi,
    needsNmiAckOnly,
    usesJoypad1,
    usesKeypad1,
    usesJoypad2,
    usesKeypad2
  };
}

function buildLegacyGeneratedHeaders(caps, symbolText = "", options = {}) {
  const ramLayout = getRamLayout("colecovision_legacy_sdcc", caps);
  const lines = [];
  const romTitleStart = options.romTitleStart ?? 0x8024;
  const romCodeStart = options.romCodeStart ?? 0x8024;
  const referencesSymbol = (name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(symbolText);
  const needsRuntimeState =
    caps.needsControllers ||
    caps.needsSpinner ||
    caps.needsSound ||
    caps.needsMusic ||
    caps.needsFrameCounter ||
    caps.needsVdpStatusShadow ||
    referencesSymbol("NO_NMI") ||
    referencesSymbol("VDP_STATUS") ||
    referencesSymbol("NMI_FLAG");
  const needsSoundState =
    caps.needsSound ||
    referencesSymbol("AMY_SOUND_ENABLED") ||
    referencesSymbol("AMY_MUSIC_ENABLED") ||
    referencesSymbol("AMY_MUSIC_POINTER") ||
    referencesSymbol("AMY_MUSIC_COUNTER") ||
    referencesSymbol("AMY_SOUND_AREA_COUNT") ||
    referencesSymbol("AMY_SOUND_TABLE_POINTER") ||
    referencesSymbol("AMY_SCREEN_VIEW_POINTER");
  const needsControllers =
    caps.needsControllers ||
    referencesSymbol("JOYPAD_1") ||
    referencesSymbol("KEYPAD_1") ||
    referencesSymbol("JOYPAD_2") ||
    referencesSymbol("KEYPAD_2");
  const needsSpinner =
    caps.needsSpinner ||
    referencesSymbol("SPINNER_ENABLED") ||
    referencesSymbol("SPINNER_1") ||
    referencesSymbol("SPINNER_2");
  const needsSprites =
    caps.needsSprites ||
    referencesSymbol("AMY_SPRITE_COUNT") ||
    referencesSymbol("AMY_SPRITE_TABLE");
  const needsTinySound =
    caps.needsTinySound ||
    referencesSymbol("AMY_TINYSOUND_SLOT_1") ||
    referencesSymbol("AMY_TINYSOUND_SLOT_2");
  const needsFrameCounter =
    caps.needsFrameCounter ||
    referencesSymbol("AMY_FRAME_COUNTER");
  const needsRandomSeed =
    caps.needsRandomSeed ||
    referencesSymbol("legacy_random_seed") ||
    referencesSymbol("AMY_FP5_RND") ||
    referencesSymbol("AMY_RANDOM_U8") ||
    /\brandom\b/i.test(symbolText) ||
    referencesSymbol("GET_RANDOM");
  const runtimeMap = buildColecoLegacyRuntimeMap({
    ...caps,
    needsControllers,
    needsSpinner,
    needsSprites,
    needsTinySound,
    needsFrameCounter,
    needsSoundState
  });
  const addr = runtimeMap.addresses;
  const hex16 = (value) => `$${value.toString(16).toUpperCase().padStart(4, "0")}`;

  lines.push("; === GENERATED LEGACY MEMORY HEADER ===");
  lines.push("; Amy canonical ColecoVision memory constants");
  lines.push("; Project-specific runtime symbols based on inferred capabilities");
  lines.push("");
  lines.push("ROM_BASE            EQU $8000");
  lines.push("ROM_HEADER_START    EQU $8000");
  lines.push("ROM_HEADER_END      EQU $8023");
  lines.push(`ROM_TITLE_START     EQU ${hex16(romTitleStart)}`);
  lines.push(`ROM_CODE_START      EQU ${hex16(romCodeStart)}`);
  lines.push("");
  lines.push("RAM_BASE            EQU $7000");
  lines.push("RAM_LEGACY_CLEAR    EQU $7000");
  lines.push("RAM_LEGACY_CLEAR_SZ EQU $03B8");
  lines.push("RAM_LEGACY_CLEAR_END EQU $73B7");
  lines.push("");
  lines.push("_buffer32           EQU $7000   ; lib4ksa/getput11 legacy scratch buffer");
  lines.push("AMY_BUFFER32        EQU _buffer32");
  if (caps.needsSound) {
    lines.push("snd_addr            EQU $7020");
    lines.push("snd_areas           EQU $702B");
  }
  if (needsRuntimeState) {
    lines.push(`_no_nmi             EQU ${hex16(addr.no_nmi)}`);
    lines.push(`_vdp_status         EQU ${hex16(addr.vdp_status)}`);
    lines.push(`_nmi_flag           EQU ${hex16(addr.nmi_flag)}`);
  }
  if (needsControllers) {
    lines.push(`_joypad_1           EQU ${hex16(addr.joypad_1)}`);
    lines.push(`_keypad_1           EQU ${hex16(addr.keypad_1)}`);
    lines.push(`_joypad_2           EQU ${hex16(addr.joypad_2)}`);
    lines.push(`_keypad_2           EQU ${hex16(addr.keypad_2)}`);
  }
  if (needsSpinner) {
    lines.push(`spinner_enabled     EQU ${hex16(addr.spinner_enabled)}`);
  }
  if (needsSprites) {
    lines.push(`AMY_SPRITE_COUNT EQU ${hex16(addr.sprite_count)}`);
    lines.push(`AMY_SPRITE_TABLE EQU ${hex16(addr.sprite_table)}`);
  }
  if (needsTinySound) {
    lines.push(`AMY_TINYSOUND_SLOT_1 EQU ${hex16(addr.tinysound_slot_1)}`);
    lines.push(`AMY_TINYSOUND_SLOT_2 EQU ${hex16(addr.tinysound_slot_2)}`);
  }
  if (needsRandomSeed) {
    lines.push("");
    lines.push("legacy_random_seed  EQU $73C8");
  }
  if (needsSpinner) {
    lines.push("_spinner_1          EQU $73EB");
    lines.push("_spinner_2          EQU $73EC");
  }
  if (needsControllers) {
    lines.push("");
    lines.push("BIOS_JOYPAD_1_RAW   EQU $73EE");
    lines.push("BIOS_JOYPAD_2_RAW   EQU $73EF");
    lines.push("BIOS_KEYPAD_1_RAW   EQU $73F0");
    lines.push("BIOS_KEYPAD_2_RAW   EQU $73F1");
  }
  if (needsFrameCounter) {
    lines.push(`AMY_FRAME_COUNTER EQU ${hex16(addr.frame_counter)}`);
  }
  lines.push("");
  lines.push("VDP_SPR_PAT_SHADOW  EQU $73F4");
  lines.push("VDP_NAME_SHADOW     EQU $73F6");
  lines.push("VDP_PATTERN_SHADOW  EQU $73F8");
  lines.push("VDP_COLOR_SHADOW    EQU $73FA");
  lines.push("");
  lines.push("VRAM_PATTERN        EQU $0000");
  lines.push("VRAM_NAME           EQU $1800");
  lines.push("VRAM_SPR_ATTR       EQU $1B00");
  lines.push("VRAM_COLOR          EQU $2000");
  lines.push("VRAM_SPR_PAT        EQU $3800");
  lines.push("");
  lines.push("; ColecoVision BIOS entry points");
  lines.push("PX_TO_PTRN_POS  EQU $07E8");
  lines.push("PUT_FRAME       EQU $080B");
  lines.push("GET_BKGRND      EQU $0898");
  lines.push("CALC_OFFSET     EQU $08C0");
  lines.push("PUTOBJP         EQU $1F67");
  lines.push("ROTATE_90       EQU $1F70");
  lines.push("LOAD_ASCII      EQU $1F7F");
  lines.push("FILL_VRAM       EQU $1F82");
  lines.push("MODE_1          EQU $1F85");
  lines.push("UPDATE_SPINNER  EQU $1F88");
  lines.push("INIT_TABLEP     EQU $1F8B");
  lines.push("GET_VRAMP       EQU $1F8E");
  lines.push("INIT_TABLE      EQU $1FB8");
  lines.push("GET_VRAM        EQU $1FBB");
  lines.push("PUT_VRAM        EQU $1FBE");
  lines.push("WRITE_VRAM      EQU $1FDF");
  lines.push("READ_VRAM       EQU $1FE2");
  lines.push("WRITE_REGISTER  EQU $1FD9");
  lines.push("READ_REGISTER   EQU $1FDC");
  lines.push("TURN_OFF_SOUND  EQU $1FD6");
  lines.push("INIT_SPR_ORDER  EQU $1FC1");
  lines.push("WR_SPR_NM_TBL   EQU $1FC4");
  if (referencesSymbol("GET_RANDOM") || referencesSymbol("AMY_RANDOM_U8")) lines.push("GET_RANDOM      EQU $1FFD");
  if (needsControllers) lines.push("UPDATE_CONTROLLERS EQU $1F76");
  if (caps.needsSound) {
    lines.push("PLAY_SOUNDS     EQU $1F61");
    lines.push("UPDATE_SOUND_ADDR EQU $1FF4");
    lines.push("SET_SOUND_TABLE EQU $1FEE");
    lines.push("PLAY_SOUND_SLOT EQU $1FF1");
  }
  if (needsRuntimeState || needsSpinner || needsFrameCounter || needsSprites || needsTinySound || needsSoundState) {
    lines.push("");
    lines.push("; Amy runtime state");
    if (needsRuntimeState) {
      lines.push(`NO_NMI          EQU ${hex16(addr.no_nmi)}`);
      lines.push(`VDP_STATUS      EQU ${hex16(addr.vdp_status)}`);
      lines.push(`NMI_FLAG        EQU ${hex16(addr.nmi_flag)}`);
    }
    if (needsControllers) {
      lines.push(`JOYPAD_1        EQU ${hex16(addr.joypad_1)}`);
      lines.push(`KEYPAD_1        EQU ${hex16(addr.keypad_1)}`);
      lines.push(`JOYPAD_2        EQU ${hex16(addr.joypad_2)}`);
      lines.push(`KEYPAD_2        EQU ${hex16(addr.keypad_2)}`);
    }
    if (needsSpinner) {
      lines.push(`SPINNER_ENABLED EQU ${hex16(addr.spinner_enabled)}`);
      lines.push("SPINNER_1       EQU $73EB");
      lines.push("SPINNER_2       EQU $73EC");
    }
    if (needsSoundState) {
      lines.push(`AMY_SOUND_ENABLED EQU ${hex16(addr.sound_enabled)}`);
      lines.push(`AMY_MUSIC_ENABLED EQU ${hex16(addr.music_enabled)}`);
      lines.push(`AMY_MUSIC_POINTER EQU ${hex16(addr.music_pointer)}`);
      lines.push(`AMY_MUSIC_COUNTER EQU ${hex16(addr.music_counter)}`);
      lines.push(`AMY_SOUND_AREA_COUNT EQU ${hex16(addr.sound_area_count)}`);
      lines.push(`AMY_SOUND_TABLE_POINTER EQU ${hex16(addr.sound_table_pointer)}`);
      lines.push(`AMY_SCREEN_VIEW_POINTER EQU ${hex16(addr.screen_view_pointer)}`);
    }
    if (needsSprites) {
      lines.push(`AMY_SPRITE_COUNT EQU ${hex16(addr.sprite_count)}`);
      lines.push(`AMY_SPRITE_TABLE EQU ${hex16(addr.sprite_table)}`);
    }
    if (needsTinySound) {
      lines.push(`AMY_TINYSOUND_SLOT_1 EQU ${hex16(addr.tinysound_slot_1)}`);
      lines.push(`AMY_TINYSOUND_SLOT_2 EQU ${hex16(addr.tinysound_slot_2)}`);
    }
    if (needsFrameCounter) {
      lines.push(`AMY_FRAME_COUNTER EQU ${hex16(addr.frame_counter)}`);
    }
  }
  lines.push("");
  lines.push(`; User RAM window: $${ramLayout.userRamStart.toString(16).toUpperCase().padStart(4, "0")}-$${(ramLayout.userRamEndExclusive - 1).toString(16).toUpperCase().padStart(4, "0")}`);
  lines.push("; === END OF GENERATED LEGACY MEMORY HEADER ===");
  return lines;
}

function emitLegacyRuntime(lines, caps) {
  if (!caps.needsNmi) {
    return;
  }
  const usesJoypad1 = !!caps.usesJoypad1;
  const usesKeypad1 = !!caps.usesKeypad1;
  const usesJoypad2 = !!caps.usesJoypad2;
  const usesKeypad2 = !!caps.usesKeypad2;
  const needsOnlyCompactControllers =
    caps.needsControllers &&
    !caps.needsSound &&
    !caps.needsMusic &&
    !caps.needsSpinner &&
    !caps.needsFrameCounter;

  lines.push("; --- Amy Coleco runtime init / NMI ---");
  lines.push("Nmi:");
  if (caps.needsNmiAckOnly) {
    lines.push("        push af");
    lines.push("        ld a,($701F)");
    lines.push("        cp $A5");
    lines.push("        jr nz,AMY_NMI_ACK_ONLY_READ_STATUS");
    lines.push("        pop af");
    lines.push("        ret");
    lines.push("AMY_NMI_ACK_ONLY_READ_STATUS:");
    lines.push("        in a,(VDP_CTRL_PORT)");
    if (caps.needsVdpStatusShadow) {
      lines.push("        ld (NMI_FLAG),a");
      lines.push("        ld (VDP_STATUS),a");
    }
    if (caps.needsSpinner) {
      lines.push("        ld a,(SPINNER_ENABLED)");
      lines.push("        or a");
      lines.push("        jr z,AMY_NMI_ACK_ONLY_END");
      lines.push("        ei");
      lines.push("AMY_NMI_ACK_ONLY_END:");
    }
    if (caps.needsFrameCounter) {
      lines.push("        push hl");
      lines.push("        ld hl,AMY_FRAME_COUNTER");
      lines.push("        inc (hl)");
      lines.push("        jr nz,AMY_NMI_FRAME_DONE_ACK");
      lines.push("        inc hl");
      lines.push("        inc (hl)");
      lines.push("AMY_NMI_FRAME_DONE_ACK:");
      lines.push("        pop hl");
    }
    lines.push("        pop af");
    lines.push("        ret");
    lines.push("");
    if (caps.needsSpinner) {
      lines.push("AMY_SPINNER_INT:");
      lines.push("        push af");
      lines.push("        push hl");
      lines.push("        call $1F88");
      lines.push("        pop hl");
      lines.push("        pop af");
      lines.push("        ei");
      lines.push("        reti");
      lines.push("");
    }
    return;
  }

  if (needsOnlyCompactControllers) {
    lines.push("        push af");
    lines.push("        ld a,($701F)");
    lines.push("        cp $A5");
    lines.push("        jr nz,AMY_NMI_COMPACT_READ_STATUS");
    lines.push("        pop af");
    lines.push("        ret");
    lines.push("AMY_NMI_COMPACT_READ_STATUS:");
    lines.push("        in a,(VDP_CTRL_PORT)");
    if (caps.needsVdpStatusShadow) {
      lines.push("        ld (NMI_FLAG),a");
      lines.push("        ld (VDP_STATUS),a");
    }
    lines.push("        push bc");
    lines.push("        push de");
    lines.push("        push hl");
    lines.push("        call UPDATE_CONTROLLERS");

    if (usesJoypad1) {
      lines.push("        ld a,($73EE)");
      lines.push("        and $4F");
      lines.push("        ld b,a");
      lines.push("        and $40");
      lines.push("        rlca");
      lines.push("        ld c,a");
      lines.push("        ld a,b");
      lines.push("        and $0F");
      lines.push("        or c");
      lines.push("        ld b,a");
      lines.push("        ld a,($73F0)");
      lines.push("        and $4F");
      lines.push("        ld c,a");
      lines.push("        and $40");
      lines.push("        or b");
      lines.push("        ld b,a");
      lines.push("        ld a,c");
      lines.push("        cpl");
      lines.push("        and $0F");
      lines.push("        ld e,a");
      lines.push("        ld a,e");
      lines.push("        cp 8");
      lines.push("        jr nz,AMY_NO_BUTTON3_1");
      lines.push("        ld a,b");
      lines.push("        or $20");
      lines.push("        ld b,a");
      lines.push("AMY_NO_BUTTON3_1:");
      lines.push("        ld a,e");
      lines.push("        cp 4");
      lines.push("        jr nz,AMY_NO_BUTTON4_1");
      lines.push("        ld a,b");
      lines.push("        or $10");
      lines.push("        ld b,a");
      lines.push("AMY_NO_BUTTON4_1:");
      lines.push("        ld a,b");
      lines.push("        ld (JOYPAD_1),a");
      if (usesKeypad1) {
        lines.push("        ld d,0");
        lines.push("        ld hl,AMY_KEYPAD_TABLE");
        lines.push("        add hl,de");
        lines.push("        ld a,(hl)");
        lines.push("        ld (KEYPAD_1),a");
      }
    } else if (usesKeypad1) {
      lines.push("        ld a,($73F0)");
      lines.push("        cpl");
      lines.push("        and $0F");
      lines.push("        ld e,a");
      lines.push("        ld d,0");
      lines.push("        ld hl,AMY_KEYPAD_TABLE");
      lines.push("        add hl,de");
      lines.push("        ld a,(hl)");
      lines.push("        ld (KEYPAD_1),a");
    }

    if (usesJoypad2) {
      lines.push("        ld a,($73EF)");
      lines.push("        and $4F");
      lines.push("        ld b,a");
      lines.push("        and $40");
      lines.push("        rlca");
      lines.push("        ld c,a");
      lines.push("        ld a,b");
      lines.push("        and $0F");
      lines.push("        or c");
      lines.push("        ld b,a");
      lines.push("        ld a,($73F1)");
      lines.push("        and $4F");
      lines.push("        ld c,a");
      lines.push("        and $40");
      lines.push("        or b");
      lines.push("        ld b,a");
      lines.push("        ld a,c");
      lines.push("        cpl");
      lines.push("        and $0F");
      lines.push("        ld e,a");
      lines.push("        ld a,e");
      lines.push("        cp 8");
      lines.push("        jr nz,AMY_NO_BUTTON3_2");
      lines.push("        ld a,b");
      lines.push("        or $20");
      lines.push("        ld b,a");
      lines.push("AMY_NO_BUTTON3_2:");
      lines.push("        ld a,e");
      lines.push("        cp 4");
      lines.push("        jr nz,AMY_NO_BUTTON4_2");
      lines.push("        ld a,b");
      lines.push("        or $10");
      lines.push("        ld b,a");
      lines.push("AMY_NO_BUTTON4_2:");
      lines.push("        ld a,b");
      lines.push("        ld (JOYPAD_2),a");
      if (usesKeypad2) {
        lines.push("        ld d,0");
        lines.push("        ld hl,AMY_KEYPAD_TABLE");
        lines.push("        add hl,de");
        lines.push("        ld a,(hl)");
        lines.push("        ld (KEYPAD_2),a");
      }
    } else if (usesKeypad2) {
      lines.push("        ld a,($73F1)");
      lines.push("        cpl");
      lines.push("        and $0F");
      lines.push("        ld e,a");
      lines.push("        ld d,0");
      lines.push("        ld hl,AMY_KEYPAD_TABLE");
      lines.push("        add hl,de");
      lines.push("        ld a,(hl)");
      lines.push("        ld (KEYPAD_2),a");
    }

    lines.push("        pop hl");
    lines.push("        pop de");
    lines.push("        pop bc");
    lines.push("        pop af");
    lines.push("        ret");
    lines.push("");
    if (usesKeypad1 || usesKeypad2) {
      lines.push("AMY_KEYPAD_TABLE:");
      lines.push("        db $FF,8,4,5,$FF,7,11,2,$FF,10,0,9,3,1,6,$FF");
      lines.push("");
    }
    return;
  }

  lines.push("        push af");
  lines.push("        ld a,($701F)");
  lines.push("        cp $A5");
  lines.push("        jr nz,AMY_NMI_READ_STATUS");
  lines.push("        pop af");
  lines.push("        ret");
  lines.push("AMY_NMI_READ_STATUS:");
  lines.push("        in a,(VDP_CTRL_PORT)");
  if (caps.needsControllers || caps.needsVdpStatusShadow) {
    lines.push("        ld (NMI_FLAG),a");
    lines.push("        ld (VDP_STATUS),a");
  }
  lines.push("        push bc");
  lines.push("        push de");
  lines.push("        push hl");
  lines.push("        push ix");
  lines.push("        push iy");
  lines.push("        ex af,af'");
  lines.push("        push af");
  lines.push("        exx");
  lines.push("        push bc");
  lines.push("        push de");
  lines.push("        push hl");
  if (caps.needsControllers) {
    lines.push("        call UPDATE_CONTROLLERS");
    lines.push("        ld hl,JOYPAD_1");
    lines.push("        ld a,($73EE)");
    lines.push("        and $4F");
    lines.push("        ld (hl),a");
    lines.push("        inc hl");
    lines.push("        ld a,($73F0)");
    lines.push("        and $4F");
    lines.push("        ld (hl),a");
    lines.push("        inc hl");
    lines.push("        ld a,($73EF)");
    lines.push("        and $4F");
    lines.push("        ld (hl),a");
    lines.push("        inc hl");
    lines.push("        ld a,($73F1)");
    lines.push("        and $4F");
    lines.push("        ld (hl),a");
    lines.push("        call AMY_DECODE_CONTROLLERS");
  }
  if (caps.needsFrameCounter) {
    lines.push("        ld hl,AMY_FRAME_COUNTER");
    lines.push("        inc (hl)");
    lines.push("        jr nz,AMY_FRAME_DONE");
    lines.push("        inc hl");
    lines.push("        inc (hl)");
    lines.push("AMY_FRAME_DONE:");
  }
  if (caps.needsMusic) {
    lines.push("        ld a,(AMY_MUSIC_ENABLED)");
    lines.push("        or a");
    lines.push("        jp z,AMY_SKIP_MUSIC_UPDATE");
    lines.push("        call AMY_UPDATE_MUSIC");
    lines.push("AMY_SKIP_MUSIC_UPDATE:");
  }
  if (caps.needsSound) {
    lines.push("        ld a,(AMY_SOUND_ENABLED)");
    lines.push("        or a");
    lines.push("        jr z,AMY_SKIP_SOUND_UPDATE");
    lines.push("        call PLAY_SOUNDS");
    lines.push("        call UPDATE_SOUND_ADDR");
    lines.push("AMY_SKIP_SOUND_UPDATE:");
  }
  lines.push("        pop hl");
  lines.push("        pop de");
  lines.push("        pop bc");
  lines.push("        exx");
  lines.push("        pop af");
  lines.push("        ex af,af'");
  lines.push("        pop iy");
  lines.push("        pop ix");
  lines.push("        pop hl");
  lines.push("        pop de");
  lines.push("        pop bc");
  if (caps.needsSpinner) {
    lines.push("        ld a,(SPINNER_ENABLED)");
    lines.push("        or a");
    lines.push("        jr z,AMY_NMI_END");
    lines.push("        ei");
    lines.push("AMY_NMI_END:");
  }
  lines.push("        pop af");
  lines.push("        ret");
  lines.push("");

  if (caps.needsSpinner) {
    lines.push("AMY_SPINNER_INT:");
    lines.push("        push af");
    lines.push("        push hl");
    lines.push("        call $1F88");
    lines.push("        pop hl");
    lines.push("        pop af");
    lines.push("        ei");
    lines.push("        reti");
    lines.push("");
  }

  if (caps.needsControllers) {
    lines.push("AMY_DECODE_CONTROLLERS:");
    lines.push("        ld ix,JOYPAD_1");
    lines.push("        call AMY_DECODE_CONTROLLER");
    lines.push("        inc ix");
    lines.push("        inc ix");
    lines.push("AMY_DECODE_CONTROLLER:");
    lines.push("        ld a,(ix+0)");
    lines.push("        ld b,a");
    lines.push("        and $40");
    lines.push("        rlca");
    lines.push("        ld c,a");
    lines.push("        ld a,b");
    lines.push("        and $0F");
    lines.push("        or c");
    lines.push("        ld b,a");
    lines.push("        ld a,(ix+1)");
    lines.push("        ld c,a");
    lines.push("        and $40");
    lines.push("        or b");
    lines.push("        ld b,a");
    lines.push("        ld a,c");
    lines.push("        cpl");
    lines.push("        and $0F");
    lines.push("        cp 8");
    lines.push("        jr nz,AMY_NO_BUTTON3");
    lines.push("        ex af,af'");
    lines.push("        ld a,b");
    lines.push("        or $20");
    lines.push("        ld b,a");
    lines.push("        ex af,af'");
    lines.push("AMY_NO_BUTTON3:");
    lines.push("        cp 4");
    lines.push("        jr nz,AMY_NO_BUTTON4");
    lines.push("        ex af,af'");
    lines.push("        ld a,b");
    lines.push("        or $10");
    lines.push("        ld b,a");
    lines.push("        ex af,af'");
    lines.push("AMY_NO_BUTTON4:");
    lines.push("        ld (ix+0),b");
    lines.push("        ld a,c");
    lines.push("        cpl");
    lines.push("        and $0F");
    lines.push("        ld e,a");
    lines.push("        ld d,0");
    lines.push("        ld hl,AMY_KEYPAD_TABLE");
    lines.push("        add hl,de");
    lines.push("        ld a,(hl)");
    lines.push("        ld (ix+1),a");
    lines.push("        ret");
    lines.push("");
    lines.push("AMY_KEYPAD_TABLE:");
    lines.push("        db $FF,8,4,5,$FF,7,11,2,$FF,10,0,9,3,1,6,$FF");
    lines.push("");
  }

  if (caps.needsSound) {
    lines.push("AMY_SOUND_TABLE_DUMMY:");
    lines.push("        dw AMY_SOUND_DUMMY,$702B");
    lines.push("AMY_SOUND_DUMMY:");
    lines.push("        db $FF");
    if (caps.needsMusic) {
      lines.push("AMY_NO_MUSIC_TRACK:");
      lines.push("        dw 0");
    }
    lines.push("");
  }
}

export function analyzeLibraryResolution(project, asmBody) {
  return resolveSelectedLibModulesDetailed(project.selectedLibs || [], asmBody);
}

function formatAsmByteList(bytes) {
  const values = Array.from(bytes || []).map((value) => `$${(value & 0xFF).toString(16).toUpperCase().padStart(2, "0")}`);
  return values.join(",");
}

export function generateAsm(project, asmBody, assetDeclarations = [], metadata = {}) {
  const asmBodyBase = asmBody;
  const cartridge = metadata?.cartridge || null;
  const romTitleStart = 0x8024;
  const romCodeStart = cartridge ? romTitleStart + cartridge.bytes.length + 1 : romTitleStart;
  const forceTinySound = sourceHintsTinySound(project.sourceText || "");
  const alexisRuntimeForCaps = renderAlexisRuntime(asmBodyBase, {
    forceTinySound
  });
  const runtimeCaps = inferRuntimeCapabilities(
    project,
    `${asmBodyBase}\n${alexisRuntimeForCaps || ""}`
  );
  if (metadata?.needsFrameCounter) {
    runtimeCaps.needsFrameCounter = true;
    runtimeCaps.needsNmi = true;
    runtimeCaps.needsNmiAckOnly = runtimeCaps.needsNmi && !runtimeCaps.needsControllers && !runtimeCaps.needsSound;
  }
  const asmBodyWithRuntimeInit = project.memoryProfile === "colecovision_legacy_sdcc"
    ? injectSystemInitInline(asmBodyBase, runtimeCaps)
    : asmBodyBase;
  const libResolution = resolveSelectedLibModulesDetailed(project.selectedLibs || [], asmBodyWithRuntimeInit);
  const selectedLibs = libResolution.paths;
  const libs = dedupeCoveredLibraryIncludes(
    resolveSelectedLibModulesDetailed(
      withRequiredAlexisLibs(project, selectedLibs, asmBodyWithRuntimeInit),
      asmBodyWithRuntimeInit
    ).paths
  ).sort();
  const bundles = (project.selectedBundles || []).slice().sort();
  const comps = project.selectedCompression.slice().sort();
  const assetPaths = [
    ...(project.selectedAssets || []),
    ...assetDeclarations.map((asset) => asset.path)
  ];
  const assets = [...new Set(assetPaths.map(normalizeAsmIncludePath))].sort();
  const embeddedProjectFiles = new Map(
    (project.projectFiles || []).map((file) => [normalizeAsmIncludePath(file.path), file])
  );
  const { headerIncludes, codeIncludes: libCodeIncludes } = splitHeaderAndCodeIncludes(libs);
  const fx16RandomIncluded = libCodeIncludes.includes("src/alexis_lib/coleco_math_fx16_random.asm");
  const excludedRuntimeSourcePaths = expandCoveredLibrarySourcePaths(libCodeIncludes);
  // If a concrete .asm library file is already included, do not auto-emit runtime helpers
  // sourced from that same file. This avoids duplicate symbol bodies and silent address drift.
  const alexisRuntime = renderAlexisRuntime(asmBodyBase, {
    forceTinySound,
    excludedSourcePaths: excludedRuntimeSourcePaths
  });
  const inferredCompression = inferRequiredCompressionIncludes(project.sourceText || "");
  const compIncludes = [...new Set([...comps.map(normalizeAsmIncludePath), ...inferredCompression.map(normalizeAsmIncludePath)])];

  const lines = [];
  lines.push("; ------------------------------------------------------------");
  lines.push(`; Amy Studio build: ${project.projectName}`);
  lines.push("; Generated by the offline web studio.");
  lines.push("; Compile with AmysCVAssembly.");
  lines.push(`; Memory profile: ${project.memoryProfile || "unspecified"}`);
  for (const replacement of libResolution.replacements) {
    const resolvedText = replacement.resolved.length
      ? replacement.resolved.join(", ")
      : "(omitted; no referenced symbols)";
    lines.push(`; Method 2 lib resolution: ${replacement.umbrella} -> ${resolvedText}`);
  }
  lines.push("; ------------------------------------------------------------");
  lines.push("");

  if (project.memoryProfile === "colecovision_legacy_sdcc") {
    lines.push(...buildLegacyGeneratedHeaders(
      {
        ...runtimeCaps,
        needsRandomSeed: runtimeCaps.needsRandomSeed || fx16RandomIncluded
      },
      `${asmBodyWithRuntimeInit}\n${alexisRuntime || ""}`,
      { romTitleStart, romCodeStart }
    ));
    lines.push("");
  }

  for (const inc of headerIncludes) lines.push(`include "${inc}"`);
  if (headerIncludes.length) lines.push("");

  if (project.memoryProfile === "colecovision_legacy_sdcc") {
    lines.push("; --- ColecoVision cartridge header ---");
    lines.push("        org     $8000");
    lines.push("");
    if (cartridge) lines.push("        db $AA,$55        ; use default ColecoVision title screen");
    else lines.push("        db $55,$AA        ; no default ColecoVision title screen");
    lines.push("        dw 0              ; no sprite table copy");
    lines.push("        dw 0              ; unused");
    lines.push("        dw $7000          ; legacy SDCC work buffer (_buffer32)");
    lines.push("        dw 0              ; unused");
    lines.push("        dw Start          ; cartridge entry point");
    lines.push("        db $C9,0,0        ; RST $08");
    lines.push("        db $C9,0,0        ; RST $10");
    lines.push("        db $C9,0,0        ; RST $18");
    lines.push("        db $C9,0,0        ; RST $20");
    lines.push("        db $C9,0,0        ; RST $28");
    lines.push("        db $C9,0,0        ; RST $30");
    if (runtimeCaps.needsSpinner) lines.push("        jp AMY_SPINNER_INT ; RST $38 / spinner");
    else lines.push("        db $C9,0,0        ; RST $38 / spinner");
    if (runtimeCaps.needsNmi) lines.push("        jp Nmi            ; NMI vector");
    else lines.push("        db $C9,0,0        ; NMI vector inactive");
    lines.push("");
    if (cartridge) {
      lines.push("; --- Coleco BIOS title metadata at $8024 ---");
      lines.push("AMY_CARTRIDGE_TITLE:");
      lines.push(`        db ${formatAsmByteList(cartridge.bytes)},$00`);
      lines.push("");
    }
    emitLegacyRuntime(lines, runtimeCaps);
  }

  if (libCodeIncludes.length || compIncludes.length) {
    lines.push("; --- Runtime/library code includes ---");
    for (const inc of libCodeIncludes) lines.push(`include "${inc}"`);
    for (const inc of compIncludes) lines.push(`include "${inc}"`);
    lines.push("");
  }

  if (alexisRuntime) {
    lines.push(alexisRuntime);
    lines.push("");
  }

  if (bundles.length) {
    lines.push("; --- Historical SDCC bundles selected for project catalog ---");
    for (const bundle of bundles) lines.push(`; bundle: ${bundle}`);
    lines.push("; Port selected routines before direct AmysCVAssembly compilation.");
    lines.push("");
  }

  if (assets.length) {
    lines.push("; --- Project assets ---");
    for (const assetPath of assets) {
      const safePath = assetPath.replace(/\\/g, "/");
      lines.push(`${assetLabelForPath(safePath, assetDeclarations)}:`);
      const embeddedFile = embeddedProjectFiles.get(safePath);
      if (embeddedFile) {
        lines.push(...formatInlineDbLines(decodeProjectFileBytes(embeddedFile)));
      } else {
        lines.push(`    incbin "${safePath}"`);
      }
    }
    lines.push("");
  }

  lines.push("; --- Program ---");
  lines.push(asmBodyWithRuntimeInit.trimEnd());
  lines.push("");

  return lines.join("\n");
}
