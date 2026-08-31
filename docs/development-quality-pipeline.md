# Amy Studio Development Quality Pipeline

Amy Studio is developed in the private DEV workspace first. A change reaches the clean
public repository only after its behavior, generated code, documentation, and browser
integration have been verified. A successful compilation or a smaller ROM is never, by
itself, proof that a change is correct.

## Core rules

- Preserve the current stable compiler and optimizer behavior until a replacement has evidence.
- Make the smallest coherent change that closes a demonstrated gap.
- Reject unsupported source forms clearly instead of compiling a plausible but incorrect ROM.
- Measure ROM and RAM changes, but treat them as diagnostics rather than correctness results.
- Test generated code at runtime whenever the change can affect values, control flow, memory,
  timing, VDP access, sound, interrupts, or optimizer liveness.
- Keep the language reference, current-version summary, autocomplete, syntax highlighting,
  examples, cookbook, changelog, and public HTML pages synchronized with the implementation.
- Port a change to clean only after DEV passes. Never use clean as the experimental workspace.
- Keep commits focused so a regression can be identified or reverted without discarding
  unrelated improvements.

## Pipeline

### 1. Establish the baseline

Before editing:

- identify the exact unsupported form, incorrect output, glitch, or optimization residue;
- capture the current diagnostic, generated ASM, ROM/RAM size, and runtime result;
- check whether existing examples depend on the current behavior;
- preserve any known-good ROM, screenshot, RAM result, VRAM result, or sound trace needed for
  before/after comparison.

### 2. Create a focused reproduction

Add the smallest test that demonstrates the requirement. Prefer a runtime-observable result:

- a PASS byte or bitfield in RAM;
- guard bytes before and after arrays, records, overlays, or buffers;
- exact multi-byte values in little-endian RAM;
- exact VRAM bytes, VDP registers, sprite attributes, or screen checkpoints;
- expected audio samples, PSG writes, sound-table state, or playback completion;
- expected source line, breakpoint, stack, or cycle-profiler state.

The test must fail for the original reason before the fix. A test-harness failure is not a
compiler failure; inspect process errors, generated ASM, symbols, and addresses before drawing
a conclusion.

### 3. Implement conservatively

- Reuse the typed operand and address resolvers instead of adding command-specific parsers.
- Preserve register values and flags according to the complete Z80 instruction behavior and
  routine ABI, including implicit clobbers.
- Keep direct scalar paths compact when qualified or indexed paths require extra preservation.
- Evaluate dynamic indexes once when repeated evaluation could change behavior or cost.
- Keep Off and Safe semantically conservative. Balanced must remain the normal dependable
  optimizer. Aggressive and Experimental may seek additional savings, but may not knowingly
  emit incorrect ROMs.
- Do not hide a missing language capability with a project-specific workaround when the same
  source form should work generally.

### 4. Run targeted static and code-generation tests

Depending on the change, verify:

- parser acceptance and fail-closed diagnostics;
- declaration, type, scope, constant-expression, RAM-layout, and bounds rules;
- generated labels, source markers, symbols, and debugger mappings;
- expected helper-library inclusion and absence of unused helpers;
- optimized ASM patterns and preservation barriers;
- unchanged ASM or ROM output for unaffected simple forms when that is an intended invariant.

Run `node --check` for modified JavaScript modules.

### 5. Run GearColeco runtime tests

Compiler, language, runtime, and optimizer changes should normally run under all five profiles:

```text
off
safe
balanced
aggressive
experimental
```

Runtime assertions should verify values and neighboring memory, not merely reach a checkpoint.
For graphics or gameplay behavior, also verify the relevant frame, VRAM, VDP, sprite, input,
or audio state. When visual timing matters, replay controller input and inspect the frames before
and after the event; use rewind and instruction/source stepping to locate transient corruption.

### 6. Run permanent self-tests

Run all related permanent tests, including neighboring numeric or storage families that share
the modified resolver or helper. Examples:

- arrays, records, overlays, locals, references, BCD, FP5, fixed, and wide integers;
- controller backends, timers, NMI, sprites, VRAM, formatting, and decompression;
- optimizer liveness and ABI preservation;
- project import, tabs, editor, debugger, documentation, and portal tests for Studio changes.

A size change does not replace these tests. Every existing self-test must still report PASS.

#### Feature matrix suites

`tools/amy-feature-matrix.mjs` registers the permanent release-gate tests and can run the
complete matrix or one focused suite. Additional private DEV experiments remain separate until
they are stable enough to promote; every such exception must have a reason in
`tools/amy-feature-matrix-exclusions.json`:

```text
node tools/amy-feature-matrix.mjs --suite language
node tools/amy-feature-matrix.mjs --suite studio
node tools/amy-feature-matrix.mjs --suite graphics
node tools/amy-feature-matrix.mjs --suite emulator
node tools/amy-feature-matrix.mjs --suite codecs
node tools/amy-feature-matrix.mjs --suite examples
```

- `language` covers parsing, code generation, ABI, RAM layout, runtime values, and optimizer safety.
- `studio` covers project/editor models, documentation search, breakpoints, replay, audio, and profiling.
- `graphics` covers graphics data, previews, TMS9918 rules, tile maps, and picture conversion.
- `emulator` covers BIOS storage, controllers, regions, web-core rewind/audio, and desktop parity.
- `codecs` verifies the published codecs with exact round trips; experimental codecs are excluded.
- `examples` holds game-specific correctness checks such as Rails Puzzles solutions and VRAM bounds.

The Studio suite validates the underlying models and integrations; it is not a browser click-through
E2E suite. Emulator tests that require a local BIOS, ROM, baseline, or desktop executable report an
explicit `SKIP` when that optional evidence is unavailable. Codec corpus tests can take longer than
the focused unit suites.

Run every registered test by omitting `--suite`. Use `--only` for comma-separated filenames or
`--from` to resume at one test within the selected suite; those two options are mutually exclusive.
Add `--full` to append a Balanced compile-and-assemble pass of the complete example catalogue:

```text
node tools/amy-feature-matrix.mjs --only test-project-tabs.mjs,test-source-breakpoints.mjs
node tools/amy-feature-matrix.mjs --suite language --from test-overlay-rom.mjs
node tools/amy-feature-matrix.mjs --full
```

### 7. Audit the complete DEV corpus

Compile every catalogued DEV example with the normal profile:

```text
node tools/check-examples.mjs --assemble --optimization balanced
```

Record:

- passed and failed examples;
- total assembled ROM bytes;
- unexpected per-example size changes;
- warnings or changes in required RAM.

When the optimizer or shared code generation changes, also use the optimizer runtime corpus and
the affected examples under all five profiles. Large games and self-testing examples are useful
stress cases, but they do not replace focused tests.

### 8. Inspect actual emulation behavior

For changes capable of producing corruption or timing regressions, compilation and RAM
assertions are insufficient. Use ROM TEST & DEBUG or the headless GearColeco core to verify:

- title, menu, gameplay, pause, game-over, and transition screens;
- controller sequences and input release/edge behavior;
- sprite priority, four-sprites-per-row handling, and sprite-table termination;
- VRAM updates relative to NMI/vblank and transient off-grid characters;
- NTSC and PAL timing where frame rate affects behavior;
- music, sound effects, mute/restore transitions, and NMI playback;
- source breakpoints, conditional watches, stepping, rewind, stack, and cycle profiling.

Use stable screenshots, VRAM snapshots, audio evidence, or test checkpoints when exact visual or
sound comparison is required. A human play test remains valuable for game feel, but repeatable
controller recordings and assertions should be added when a bug can be automated.

### 9. Update every public surface

Before synchronization, update what the programmer actually sees:

- `docs/amy-language.md` for syntax and semantics;
- `docs/amy-current-version.md` for supported boundaries;
- `docs/amy-optimization-cookbook.md` for measured programming guidance;
- autocomplete and contextual syntax highlighting;
- visible Studio examples and their index when a feature needs demonstration;
- `docs/CHANGELOG.md` with factual verification notes;
- public home, documentation, and comparison pages when capabilities or links change.

Do not document a proposal as implemented. Remove stale limitations once tests prove the feature.

### 10. Synchronize and re-verify clean

Copy only the proven implementation, tests, examples, and useful public documentation into the
clean repository. Do not copy private audits, temporary ROMs, commercial material, abandoned
experiments, emulator source trees, or internal handoff documents.

Then rerun in clean:

- targeted tests;
- relevant five-profile runtime tests;
- the clean example corpus;
- documentation/portal integrity tests;
- `git diff --check` and a final status review.

The clean corpus total should stay unchanged unless the modification intentionally changes
generated code or public examples. Investigate every unexplained difference.

### 11. Commit with evidence

Use a focused commit message describing the behavior, not the implementation accident. Report:

- what changed;
- which runtime and corpus tests passed;
- whether ROM/RAM totals changed;
- any remaining limitation or manual test requirement.

## Stop conditions

Do not port or commit a feature as complete when any of these is true:

- a self-test fails under any supported profile;
- an optimizer profile changes program behavior;
- guard bytes, RAM layout, stack state, VRAM, VDP, or audio state are corrupted;
- a ROM-size gain is unexplained or accompanied by missing code;
- a transient visual glitch remains reproducible;
- documentation claims more than the compiler accepts;
- DEV and clean produce unexplained differences for the same source and profile.

When evidence is incomplete, keep the work in DEV, document the open question, and request a
second QA review rather than weakening the test.

## Standard release gate

A language or Studio improvement is ready for clean when all applicable boxes are true:

- [ ] focused reproduction failed before and passes after;
- [ ] parser and fail-closed diagnostics verified;
- [ ] generated ASM and register/flag preservation reviewed;
- [ ] runtime test passes under all affected optimizer profiles;
- [ ] related permanent self-tests pass;
- [ ] complete DEV corpus passes and size changes are explained;
- [ ] visual, input, audio, NMI, and timing behavior checked where relevant;
- [ ] language docs, autocomplete, highlighting, examples, cookbook, and HTML pages updated;
- [ ] clean targeted tests and corpus pass;
- [ ] clean diff contains no private audit or temporary material;
- [ ] focused clean commit created with verification results.
