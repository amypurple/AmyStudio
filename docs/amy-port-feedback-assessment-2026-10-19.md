# Amy port feedback assessment - 2026-10-19

Source: `amy-port-feedback-2026-10-19.md`, based on thirteen real TI-99/4A
ports. Priority reflects correctness, repeated workaround cost, and whether the
feature belongs in the language rather than in one game.

## Immediate priorities

1. **Arbitrary-position menus** - implemented. `choose menu ... at list Data`
   replaces manual horizontal or irregular menu loops and retains wrapping,
   keypad selection, FIRE confirmation, input release, controller selection,
   tile clearing, and CRT-safe `sleep after`. Tile and sprite cursor forms are
   covered by code-generation tests; a ROM test exercises all five optimizer
   profiles. This work also found and fixed a pre-existing RAM overlap between
   the menu sleep counter and the first user variables.
2. **Inline `if` consistency** - high priority. Rejecting otherwise valid
   standalone statements after `then` is unpredictable and multiplies source
   lines. This needs a shared single-statement dispatcher plus negative tests;
   implementing isolated statement exceptions would deepen the inconsistency.
3. **Headless ROM execution and screenshots** - high priority for quality,
   though it is tooling rather than language design. Existing GearColeco test
   infrastructure should become a supported `amyc` run mode instead of another
   emulator path. It would catch missing display enable, sprite setup, font
   collisions, overscan violations, and menu rendering regressions.
4. **Sprite safety** - high priority because failures are silent. Documentation
   and diagnostics must make `clear sprites` resetting the active count obvious.
   A safe handling option for Y=$D0 is useful, but should not silently alter
   intentional terminator behavior unless requested.
5. **Mixed-width numeric comparisons** - implemented and runtime-validated.
   Mixed `u8`/`i8`/`u16`/`i16` operands now widen only as far as required and
   avoid the generic 32-bit scratch path. The audit also fixed operand reversal:
   moving a constant from the left side to the right now reverses `<`/`>` while
   preserving `=`/`<>`, instead of incorrectly negating the condition. Dedicated
   fixed-point, BCD, and FP5 semantics remain isolated. Boundary matrices cover
   -32768, -128, -1, 0, 127, 255, 256, 32767, and 65535 in all five optimizer
   profiles; a second matrix covers `u32`, `i32`, and `fixed32` against zero in
   both operand orders.

## Valuable, bounded additions

- **Safe-area warnings** are useful and runtime-free. They should remain
  warnings because overscan differs among displays and deliberate edge drawing
  is valid.
- **Character maps** remove conversion scripts and duplicated ASCII fonts. A
  compile-time ROM-data transformation is low-risk once syntax and diagnostics
  are settled.
- **Text-window scrolling** is a reusable library operation. It should accept a
  rectangle and fill byte, while allowing the compiler to choose compact OS7 or
  direct VRAM copies according to size and target.
- **Sound declarations** would improve CLI-only authoring, but should share the
  existing Sound FX encoder and file format rather than introduce a second
  synthesis implementation.
- **Screen-on analysis and named keypad constants** are small, useful compiler
  diagnostics/documentation changes.

## Longer-term design work

- **Signed fixed-point sprite motion** is valuable but introduces a public
  numeric type and update semantics. It needs a separate design and RAM/cycle
  budget before syntax is accepted.
- **Spatial nearest-neighbor menu navigation** belongs on top of `at list`, but
  it requires deterministic distance/tie rules and costs more ROM than ordered
  previous/next navigation. The current list form already supports rows,
  columns, wrapped groups, maps, and planets in an explicit artist-controlled
  order.
- **Keypad escape clauses** are useful for `*` and `#`, but should follow the
  list-menu foundation with a modern result model and tests for overlap with the
  normal range.

The guiding rule is compatibility: existing vertical menus keep their exact
behavior and encoding. New general forms are opt-in, and every optimization or
convenience feature needs before/after ROM tests rather than source-only proof.
