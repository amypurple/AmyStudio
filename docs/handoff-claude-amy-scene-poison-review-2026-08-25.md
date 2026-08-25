# Handoff to Claude: Amy scene poison and NMI-safety review

## Objective

Perform an adversarial correctness review of Amy's opt-in scene-overlay poison mode.
Look for silent RAM corruption, NMI visibility, optimizer-sensitive behavior, false
debugger conclusions, and release-build overhead. Do not propose broader scene syntax
unless it closes a concrete defect in this implementation.

## Implemented contract

An Amy project may enable:

```amy
define AMY_DEBUG_SCENE_POISON
```

Every compiler-managed `enter SceneName` emits this order:

1. `call AMY_VRAM_BEGIN`;
2. set `AMY_ACTIVE_SCENE` to zero;
3. `call AMY_SCENE_DEBUG_POISON`;
4. run the target scene's parameterless initializer;
5. publish the target scene ID;
6. `call AMY_VRAM_END`.

The helper fills exactly the physical overlay reservation with `$CD`. It uses one byte
store for a one-byte overlay, otherwise a first store plus `LDIR`. The helper and calls
are absent when the define is absent. Overlay metadata contains `debugPoison: 205` only
in enabled builds.

ROM TEST & DEBUG preserves inactive-part gating. When the Memory Map is opened or
explicitly refreshed, an active field whose complete byte range remains `$CD` is labeled
`POISON`. It is not scanned every emulated frame.

## Files to inspect

- `studio/core/compiler/transpileAmyCore.js`
- `studio/core/romDebuggerModel.js`
- `studio/core/romTestRecorderUi.js`
- `studio/app.js`
- `tools/test-ref-param-codegen.mjs`
- `tools/test-scene-poison-rom.mjs`
- `tools/test-rom-debugger-model.mjs`
- `studio/examples-src/amy-scene-poison-selftest.alexis`
- `docs/spec-amy-scenes-ram-overlays-2026-08-23.md`

## Verified evidence

- Codegen test proves the define is opt-in, an inactive conditional define has no effect,
  poison precedes initialization, metadata exports `$CD`, and release ASM contains no
  poison symbol or call.
- GearColeco ROM test checks a lower `$5A` guard, a two-byte overlay, an upper `$A5`
  guard, initialized value `$42`, omitted value `$CD`, and active scene ID `1`.
- The ROM test passes Off, Safe, Balanced, Aggressive, and Experimental.
- Alexis Balanced audit: 202/202 locally visible examples assembled.
- Clean-repository Balanced audit: 55/55 public examples assembled.

## Questions

1. Can `AMY_VRAM_BEGIN` or any pending NMI path observe the poison or half-initialized
   overlay despite `AMY_ACTIVE_SCENE = 0`?
2. Is the helper's `HL/DE/BC` clobbering safe at every legal `enter` site and under every
   optimizer profile?
3. Can dead-init elimination, initializer inlining, source markers, or peepholes reorder
   poison after a target initializer or remove a required write?
4. Are one-byte, maximum-size, nested-record, BCD, and array fields represented correctly
   by `reservedBytes`, field `width`, and debugger byte-range checks?
5. Is treating a complete `$CD` field as suspected poison appropriately conservative?
   Identify cases where a valid value or partially initialized aggregate could mislead.
6. Can stale compiled metadata, project-tab switching, external ROM loading, or recompiling
   without the define leave an incorrect `POISON` label in the UI?
7. Is release zero-cost proven strongly enough, including no metadata, helper label, call,
   warning, RAM byte, or optimizer barrier?
8. What additional minimal regression would catch the most serious remaining defect?

## Expected response

Return findings first, ordered by severity, with exact file/line references and a minimal
reproducer where possible. Separate confirmed defects from defensive improvements. End
with a release verdict: safe as experimental, requires fixes, or unsafe.
