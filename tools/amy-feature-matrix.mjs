#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const full = process.argv.includes("--full");
const fromIndex = process.argv.indexOf("--from");
const fromFile = fromIndex >= 0 ? process.argv[fromIndex + 1] : null;
const onlyIndex = process.argv.indexOf("--only");
const onlyFiles = onlyIndex >= 0
  ? new Set(String(process.argv[onlyIndex + 1] || "").split(",").map((file) => file.trim()).filter(Boolean))
  : null;
const suiteIndex = process.argv.indexOf("--suite");
const suite = suiteIndex >= 0 ? String(process.argv[suiteIndex + 1] || "").trim().toLowerCase() : null;
const biosPath = process.env.AMY_COLECO_BIOS || resolve(root, "studio", "bios", "colecovision.rom");
const hasBios = existsSync(biosPath);
const tests = [
  { file: "test-expression-fail-closed.mjs", area: "expressions", evidence: "compile+assemble" },
  { file: "test-amy-syntax-tokenizer.mjs", area: "syntax-tokenizer", evidence: "compile+assemble" },
  { file: "test-amy-syntax-overlay.mjs", area: "syntax-overlay-rendering", evidence: "compile+assemble" },
  { file: "test-start-runtime-init-codegen.mjs", area: "initializers", evidence: "compile+assemble" },
  { file: "test-runtime-catalog-dependencies.mjs", area: "runtime-linking", evidence: "compile+assemble" },
  { file: "test-set-sprite-codegen.mjs", area: "sprites", evidence: "compile+assemble" },
  { file: "test-sprite-flicker-codegen.mjs", area: "sprite-flicker", evidence: "rom" },
  { file: "test-120-color-codegen.mjs", area: "120-color-mode", evidence: "compile+assemble" },
  { file: "test-word-table-codegen.mjs", area: "word-tables", evidence: "compile+assemble" },
  { file: "test-data-count-codegen.mjs", area: "data-count", evidence: "compile+assemble" },
  { file: "test-play-sounds-codegen.mjs", area: "multi-sound-playback", evidence: "compile+assemble" },
  { file: "test-dsound-nmi-codegen.mjs", area: "dsound-nmi-protection", evidence: "compile+assemble" },
  { file: "test-text-color-codegen.mjs", area: "text-color-codegen", evidence: "compile+assemble" },
  { file: "test-wait-codegen.mjs", area: "wait-codegen", evidence: "compile+assemble" },
  { file: "test-tile-screen-codegen.mjs", area: "tile-screen-codegen", evidence: "compile+assemble" },
  { file: "test-vram-workspace-codegen.mjs", area: "vram-workspace", evidence: "compile+assemble" },
  { file: "test-sound-area-layout.mjs", area: "sound-ram-layout", evidence: "unit" },
  { file: "test-wait-or-press-codegen.mjs", area: "timed-input-wait", evidence: "compile+assemble" },
  { file: "test-int16-byte-widening-codegen.mjs", area: "integer-widening", evidence: "compile+assemble" },
  { file: "test-mixed-sign-compare-codegen.mjs", area: "mixed-sign-comparisons", evidence: "compile+assemble" },
  { file: "test-mul-div-assign-codegen.mjs", area: "multiply-divide-assignment", evidence: "compile+assemble" },
  { file: "test-divide-by-zero-diagnostics.mjs", area: "divide-by-zero-diagnostics", evidence: "compile+assemble" },
  { file: "test-array-bulk-codegen.mjs", area: "bulk-arrays", evidence: "compile+assemble" },
  { file: "test-fill-array-qualified-rom.mjs", area: "qualified-array-fill-reverse", evidence: "rom" },
  { file: "test-fill-record-array-qualified-rom.mjs", area: "qualified-record-array-fill", evidence: "rom" },
  { file: "test-shift-array-qualified-rom.mjs", area: "qualified-array-shift", evidence: "rom" },
  { file: "test-format-qualified-buffer-rom.mjs", area: "qualified-format-buffer", evidence: "rom" },
  { file: "test-2d-array-rom.mjs", area: "two-dimensional-arrays", evidence: "rom" },
  { file: "test-local-for-each-rom.mjs", area: "local-array-iteration", evidence: "rom" },
  { file: "test-for-loop-codegen.mjs", area: "qualified-loop-lowering", evidence: "rom" },
  { file: "test-for-each-short-rom.mjs", area: "implicit-index-array-iteration", evidence: "rom" },
  { file: "test-whole-record-copy-rom.mjs", area: "whole-record-copy", evidence: "rom" },
  { file: "test-whole-record-compare-rom.mjs", area: "whole-record-compare", evidence: "rom" },
  { file: "test-swap-qualified-rom.mjs", area: "qualified-swap", evidence: "rom" },
  { file: "test-select-tuple-rom.mjs", area: "tuple-selection", evidence: "rom" },
  { file: "test-ref-param-codegen.mjs", area: "qualified-operands", evidence: "compile+assemble" },
  { file: "test-qualified-math-bit-rom.mjs", area: "qualified-math-bit", evidence: "rom" },
  { file: "test-vpeek-qualified-rom.mjs", area: "qualified-vram-read", evidence: "rom" },
  { file: "test-pget-qualified-rom.mjs", area: "qualified-pixel-read", evidence: "rom" },
  { file: "test-replace-frame-qualified-rom.mjs", area: "qualified-replacement-count", evidence: "rom" },
  { file: "test-get-char-qualified-rom.mjs", area: "qualified-tile-read", evidence: "rom" },
  { file: "test-put-frame-qualified-rom.mjs", area: "qualified-frame-write", evidence: "rom" },
  { file: "test-put-count-qualified-rom.mjs", area: "qualified-row-write", evidence: "rom" },
  { file: "test-put-implicit-qualified-rom.mjs", area: "qualified-inferred-row-write", evidence: "rom" },
  { file: "test-inline-qualified-vram-rom.mjs", area: "inline-qualified-vram", evidence: "rom" },
  { file: "test-inline-qualified-inc-dec-rom.mjs", area: "inline-qualified-inc-dec", evidence: "rom" },
  { file: "test-inline-qualified-toggle-rom.mjs", area: "inline-qualified-toggle", evidence: "rom" },
  { file: "test-choose-qualified-rom.mjs", area: "qualified-menu-choice", evidence: "rom" },
  { file: "test-controller-ram-safety.mjs", area: "controller-ram-layout", evidence: "compile+assemble" },
  { file: "test-controller-backend-selection-rom.mjs", area: "controller-backend-selection", evidence: "rom" },
  { file: "test-joypad-pressed-rom.mjs", area: "controller-edge-input", evidence: "rom" },
  { file: "test-overlay-layout-rom.mjs", area: "overlay-qualified-runtime", evidence: "rom" },
  { file: "test-overlay-rom.mjs", area: "overlay-integration", evidence: "rom" },
  { file: "test-overlay-layout-codegen.mjs", area: "overlay-layout-codegen", evidence: "compile+assemble" },
  { file: "test-overlay-array-copy-codegen.mjs", area: "overlay-array-copy", evidence: "compile+assemble" },
  { file: "test-overlay-scope-alias-rom.mjs", area: "overlay-scope-aliases", evidence: "rom" },
  { file: "test-amy-timer-rom.mjs", area: "named-timers", evidence: "rom" },
  { file: "test-amy-timer-codegen.mjs", area: "named-timer-codegen", evidence: "compile+assemble" },
  { file: "test-amy-timer-safety-rom.mjs", area: "timer-safety", evidence: "rom" },
  { file: "test-pause-until-press-rom.mjs", area: "crt-safe-pause", evidence: "rom" },
  { file: "test-crt-safe-pause-backdrop.mjs", area: "crt-safe-backdrop", evidence: "compile+assemble" },
  { file: "test-scene-lifecycle-rom.mjs", area: "scene-lifecycle", evidence: "rom" },
  { file: "test-scene-poison-rom.mjs", area: "scene-poison", evidence: "rom" },
  { file: "test-state-machine-codegen.mjs", area: "state-machines", evidence: "compile+assemble" },
  { file: "test-checkpoint-codegen.mjs", area: "debug-checkpoints", evidence: "compile+assemble" },
  { file: "test-static-abi-asm-entry-rom.mjs", area: "static-abi-asm-entry", evidence: "rom" },
  { file: "test-static-abi-analysis.mjs", area: "static-abi-analysis", evidence: "compile+assemble" },
  { file: "test-static-frameless-abi-codegen.mjs", area: "static-frameless-abi", evidence: "rom" },
  { file: "test-local-first-pass-scope.mjs", area: "local-first-pass-scope", evidence: "compile+assemble" },
  { file: "test-sub-declaration-forms-codegen.mjs", area: "sub-declaration-forms", evidence: "compile+assemble" },
  { file: "test-inline-if-elseif-codegen.mjs", area: "inline-conditionals", evidence: "compile+assemble" },
  { file: "test-nmi-prologue-codegen.mjs", area: "nmi-prologue", evidence: "compile+assemble" },
  { file: "test-screen-nmi-codegen.mjs", area: "screen-nmi-state", evidence: "compile+assemble" },
  { file: "test-compile-time-conditionals.mjs", area: "conditional-compilation", evidence: "compile+assemble" },
  { file: "test-record-array-rom.mjs", area: "record-arrays", evidence: "rom" },
  { file: "test-local-record-rom.mjs", area: "local-records", evidence: "rom" },
  { file: "test-record-alias-codegen.mjs", area: "record-aliases", evidence: "compile+assemble" },
  { file: "test-record-array-field-codegen.mjs", area: "record-array-fields", evidence: "rom" },
  { file: "test-sprite-field-index-rom.mjs", area: "sprite-field-indexes", evidence: "rom" },
  { file: "test-bcd-inc-dec-rom.mjs", area: "bcd", evidence: "rom" },
  { file: "test-bcd-array-rom.mjs", area: "bcd-arrays", evidence: "rom" },
  { file: "test-local-bcd-initializer-rom.mjs", area: "local-bcd-initializers", evidence: "rom" },
  { file: "test-bcd-fp5-format-rom.mjs", area: "bcd-fp5-formatting", evidence: "rom" },
  { file: "test-chars-in-box-rom.mjs", area: "tile-collision", evidence: "rom" },
  { file: "test-print-at-syntax.mjs", area: "typed-printing", evidence: "compile+assemble" },
  { file: "test-keypad-choice-codegen.mjs", area: "keypad-menu-choice", evidence: "compile+assemble" },
  { file: "test-legacy-u32-rom.mjs", area: "legacy-wide-integers", evidence: "rom" },
  { file: "test-fp5-function-return-rom.mjs", area: "fp5-function-return", evidence: "rom" },
  { file: "test-fp5-array-rom.mjs", area: "fp5-arrays", evidence: "rom" },
  { file: "test-fp5-fixed32-conversion-rom.mjs", area: "fp5-fixed32-conversion", evidence: "rom" },
  { file: "test-fixed-fixed32-conversion-rom.mjs", area: "fixed-fixed32-conversion", evidence: "rom" },
  { file: "test-fixed32-array-rom.mjs", area: "fixed32-arrays-records-overlays", evidence: "rom" },
  { file: "test-fixed-array-element-rom.mjs", area: "fixed-array-elements", evidence: "rom" },
  { file: "test-fixed-byte-context-codegen.mjs", area: "fixed-byte-contexts", evidence: "compile+assemble" },
  { file: "test-fixed-ref-param-rom.mjs", area: "fixed-reference-parameters", evidence: "rom" },
  { file: "test-fixed-recursion-rom.mjs", area: "fixed-recursion", evidence: "rom" },
  { file: "test-wide-binary-expression-rom.mjs", area: "wide-binary-expressions", evidence: "rom" },
  { file: "test-wide-bitwise-shift-rom.mjs", area: "wide-bitwise-shifts", evidence: "rom" },
  { file: "test-wide-call-return-expression-rom.mjs", area: "wide-call-return-expressions", evidence: "rom" },
  { file: "test-wide-ref-param-rom.mjs", area: "wide-reference-parameters", evidence: "rom" },
  { file: "test-value-param-sub-rom.mjs", area: "value-parameter-subs", evidence: "rom" },
  { file: "test-bcd-boundaries-rom.mjs", area: "bcd-boundaries", evidence: "rom" },
  { file: "test-compile-time-constant-contexts.mjs", area: "compile-time-constants", evidence: "compile+assemble" },
  { file: "test-optimizer-indexed-immediate-a-liveness.mjs", area: "optimizer-accumulator-liveness", evidence: "compile+assemble" },
  { file: "test-optimizer-exx-barrier.mjs", area: "optimizer-exx-barriers", evidence: "compile+assemble" },
  { file: "test-optimizer-half-register-proof.mjs", area: "optimizer-half-register-liveness", evidence: "compile+assemble" },
  { file: "test-optimizer-aggressive-duplicate-l-zero.mjs", area: "optimizer-duplicate-l-zero", evidence: "compile+assemble" },
  { file: "test-optimizer-aggressive-redundant-push-pop.mjs", area: "optimizer-redundant-push-pop", evidence: "compile+assemble" },
  { file: "test-indexed-put-codegen.mjs", area: "indexed-put-source", evidence: "compile+assemble" },
  { file: "test-global-initializers-rom.mjs", area: "layout-and-wide-integers", evidence: "rom" },
  { file: "test-array-store-layout-rom.mjs", area: "array-index-layout", evidence: "rom" },
  { file: "test-spinner-rom.mjs", area: "spinner-input", evidence: "rom" },
  { file: "test-runtime-input-rom.mjs", area: "runtime-input-expressions", evidence: "rom" },
  { file: "test-amy-math-demo-rom.mjs", area: "math-demo-runtime", evidence: "rom" },
  { file: "test-meteor-dodge-rom.mjs", area: "representative-game-runtime", evidence: "rom" },
  { file: "test-sort-examples-rom.mjs", area: "sorting-runtime", evidence: "rom" },
  { file: "test-internal-compiler-single-pass.mjs", area: "single-pass-studio-compile", evidence: "compile+assemble" },
  { file: "test-project-file-import.mjs", area: "project-import", evidence: "unit", suite: "studio" },
  { file: "test-project-file-text-editor.mjs", area: "project-file-editor", evidence: "unit", suite: "studio" },
  { file: "test-project-tabs.mjs", area: "project-tabs", evidence: "unit", suite: "studio" },
  { file: "test-editor-adapter.mjs", area: "source-editor-adapter", evidence: "unit", suite: "studio" },
  { file: "test-docs-search-filter.mjs", area: "documentation-search", evidence: "unit", suite: "studio" },
  { file: "test-public-portal.mjs", area: "public-portal", evidence: "unit", suite: "studio" },
  { file: "test-rom-debugger-model.mjs", area: "debugger-model", evidence: "unit", suite: "studio" },
  { file: "test-rom-recorder-breakpoint.mjs", area: "debugger-breakpoints", evidence: "unit", suite: "studio" },
  { file: "test-rom-test-audio-sink.mjs", area: "debugger-audio", evidence: "unit", suite: "studio" },
  { file: "test-rom-test-case.mjs", area: "debugger-test-cases", evidence: "unit", suite: "studio" },
  { file: "test-rom-test-case-replay.mjs", area: "debugger-replay", evidence: "unit", suite: "studio" },
  { file: "test-rom-test-recorder.mjs", area: "debugger-recorder", evidence: "unit", suite: "studio" },
  { file: "test-routine-cycle-profiler.mjs", area: "debugger-cycle-profiler", evidence: "unit", suite: "studio" },
  { file: "test-source-breakpoints.mjs", area: "source-breakpoints", evidence: "unit", suite: "studio" },
  { file: "test-source-debug-map.mjs", area: "source-debug-map", evidence: "unit", suite: "studio" },
  { file: "test-studio-docs-catalog.mjs", area: "studio-docs-catalog", evidence: "unit", suite: "studio" },
  { file: "test-feature-matrix-docs.mjs", area: "feature-matrix-documentation", evidence: "unit", suite: "studio" },
  { file: "test-graphics-asset-access.mjs", area: "graphics-assets", evidence: "unit", suite: "graphics" },
  { file: "test-graphics-entry-ops.mjs", area: "graphics-entry-operations", evidence: "unit", suite: "graphics" },
  { file: "test-graphics-impact.mjs", area: "graphics-impact-analysis", evidence: "unit", suite: "graphics" },
  { file: "test-graphics-metadata.mjs", area: "graphics-metadata", evidence: "unit", suite: "graphics" },
  { file: "test-graphics-preview-filters.mjs", area: "graphics-preview", evidence: "unit", suite: "graphics" },
  { file: "test-graphics-tilemap-selection.mjs", area: "graphics-tilemap-selection", evidence: "unit", suite: "graphics" },
  { file: "test-graphics-tms9918.mjs", area: "graphics-tms9918-rules", evidence: "unit", suite: "graphics" },
  { file: "test-picture-converter.mjs", area: "picture-converter", evidence: "unit", suite: "graphics" },
  { file: "test-picture-preview-paths.mjs", area: "picture-preview-paths", evidence: "unit", suite: "graphics" },
  { file: "test-tms9918-bitmap-optimization.mjs", area: "bitmap-compression-safety", evidence: "unit", suite: "graphics" },
  { file: "test-graphics-bitmap-tools.mjs", area: "bitmap-editor-tools", evidence: "unit", suite: "graphics" },
  { file: "test-coleco-bios-storage.mjs", area: "bios-storage", evidence: "unit", suite: "emulator" },
  { file: "test-emulator-bios-prompt.mjs", area: "bios-prompt", evidence: "unit", suite: "emulator" },
  { file: "test-controller-profiles.mjs", area: "controller-profiles", evidence: "unit", suite: "emulator" },
  { file: "test-mouse-spinner-input.mjs", area: "mouse-spinner", evidence: "unit", suite: "emulator" },
  { file: "test-gearcoleco-region.mjs", area: "pal-ntsc-region", evidence: "unit", suite: "emulator" },
  { file: "test-gearcoleco-web-core.mjs", area: "gearcoleco-web-core", evidence: "unit", suite: "emulator", args: ["--rom", "build/rom-tests/warrior-dan2-fire-visual-test.rom"], requires: ["studio/bios/colecovision.rom", "build/rom-tests/warrior-dan2-fire-visual-test.rom"] },
  { file: "test-gearcoleco-web-audio.mjs", area: "gearcoleco-web-audio", evidence: "unit", suite: "emulator", requires: ["studio/bios/colecovision.rom", "build/rom-tests/commando-tiny-music-box.rom"] },
  { file: "test-gearcoleco-web-rewind.mjs", area: "gearcoleco-web-rewind", evidence: "unit", suite: "emulator", args: ["--rom", "build/rom-tests/warrior-dan2-fire-visual-test.rom"], requires: ["studio/bios/colecovision.rom", "build/rom-tests/warrior-dan2-fire-visual-test.rom"] },
  { file: "test-gearcoleco-web-desktop-parity.mjs", area: "gearcoleco-parity", evidence: "unit", suite: "emulator", requires: ["studio/bios/colecovision.rom", "build/rom-tests/warrior-dan2-fire-visual-test.rom", "build/rom-tests/warrior-dan2-fire-visual-test.sym", "tools/rom-baselines/warrior-dan2-fire-prompt.json"] },
  { file: "test-rom-gearcoleco.mjs", area: "gearcoleco-rom-runner", evidence: "unit", suite: "emulator", args: ["--rom", "build/rom-tests/warrior-dan2-fire-visual-test.rom", "--frames", "1"], requires: ["build/rom-tests/warrior-dan2-fire-visual-test.rom", process.env.GEARCOLECO_EXE || resolve(process.env.LOCALAPPDATA || "", "AmyStudio", "emulators", "gearcoleco-1.6.8", "Gearcoleco.exe")] },
  { file: "test-nibble-codec.mjs", area: "nibble-codec", evidence: "unit", suite: "codecs" },
  { file: "test-warrior-codecs.mjs", area: "warrior-codec-corpus", evidence: "unit", suite: "codecs" },
  { file: "test-rails-puzzle-vram-bounds.mjs", area: "rails-puzzle-vram-safety", evidence: "rom", suite: "examples" },
  { file: "test-train-track-puzzles.mjs", area: "rails-puzzle-solutions", evidence: "unit", suite: "examples" }
];

const testNames = tests.map((test) => test.file);
const duplicateTests = [...new Set(testNames.filter((file, index) => testNames.indexOf(file) !== index))];
const missingTests = testNames.filter((file) => !existsSync(resolve(root, "tools", file)));
if (duplicateTests.length || missingTests.length) {
  if (duplicateTests.length) console.error(`Duplicate matrix test(s): ${duplicateTests.join(", ")}`);
  if (missingTests.length) console.error(`Missing matrix test file(s): ${missingTests.join(", ")}`);
  process.exit(2);
}

if (suite && !["language", "studio", "graphics", "emulator", "codecs", "examples"].includes(suite)) {
  console.error(`Unknown matrix suite: ${suite}`);
  process.exit(2);
}
const suiteTests = suite ? tests.filter((test) => (test.suite || "language") === suite) : tests;
const selectedStart = fromFile ? suiteTests.findIndex((test) => test.file === fromFile) : 0;
if (fromFile && selectedStart < 0) {
  console.error(`Unknown matrix test for --from: ${fromFile}`);
  process.exit(2);
}
if (fromFile && onlyFiles) {
  console.error("Use either --from or --only, not both.");
  process.exit(2);
}
if (onlyFiles) {
  if (onlyFiles.size === 0) {
    console.error("--only requires one or more comma-separated test filenames.");
    process.exit(2);
  }
  const suiteTestNames = suiteTests.map((test) => test.file);
  const unknownFiles = [...onlyFiles].filter((file) => !suiteTestNames.includes(file));
  if (unknownFiles.length) {
    console.error(`Unknown matrix test(s) for --only: ${unknownFiles.join(", ")}`);
    process.exit(2);
  }
}
const selectedTests = onlyFiles ? suiteTests.filter((test) => onlyFiles.has(test.file)) : suiteTests.slice(selectedStart);

const results = [];
const biosTests = new Set(selectedTests.filter((test) => test.evidence === "rom").map((test) => test.file));

for (const test of selectedTests) {
  const { file, area, evidence, args = [], requires = [] } = test;
  const missingRequirements = requires.map((path) => resolve(root, path)).filter((path) => !existsSync(path));
  if (missingRequirements.length) {
    results.push({ test: file, area, evidence, passed: true, skipped: true, elapsedMs: 0, reason: `Missing optional requirement(s): ${missingRequirements.join(", ")}` });
    console.log(`SKIP ${file}: missing optional requirement(s).`);
    continue;
  }
  if (biosTests.has(file) && !hasBios) {
    results.push({ test: file, area, evidence, passed: true, skipped: true, elapsedMs: 0, reason: "Set AMY_COLECO_BIOS to run BIOS-backed ROM assertions." });
    console.log(`SKIP ${file}: ColecoVision BIOS not configured (set AMY_COLECO_BIOS).`);
    continue;
  }
  console.log(`RUN  ${file}`);
  const started = Date.now();
  const result = spawnSync(process.execPath, [resolve(root, "tools", file), ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  results.push({ test: file, area, evidence, passed: result.status === 0, elapsedMs: Date.now() - started });
  if (output) process.stdout.write(`${output}\n`);
  if (result.status !== 0) {
    if (result.error?.code === "ETIMEDOUT") process.stderr.write(`${file} exceeded the 120 second test limit.\n`);
    process.stderr.write(`Amy feature matrix stopped at ${file}.\n`);
    process.exit(result.status ?? 1);
  }
  console.log(`PASS ${file} (${Date.now() - started} ms)`);
}

if (full) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [resolve(root, "tools", "check-examples.mjs"), "--assemble", "--optimization", "balanced"], {
    cwd: root,
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  results.push({ test: "check-examples.mjs --assemble --optimization balanced", area: "catalogue", evidence: "compile+assemble", passed: result.status === 0, elapsedMs: Date.now() - started });
  if (output) process.stdout.write(`${output}\n`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const elapsedMs = results.reduce((sum, item) => sum + item.elapsedMs, 0);
console.log(JSON.stringify({ passed: true, suite, full, from: fromFile, only: onlyFiles ? [...onlyFiles] : null, elapsedMs, results }, null, 2));
