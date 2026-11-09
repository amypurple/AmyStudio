# Skill: Graphics II, CRT Safe Area, and ZX0

Use this skill for bitmap title screens, Graphics II pictures, compressed graphics,
or layouts intended for a consumer CRT television.

## Separate three different concerns

1. The TMS9918A generates a 256x192 active picture.
2. A consumer CRT may hide part of that active picture behind its mask and overscan.
3. Amy Studio's CRT presentation simulates that viewing condition without changing
   VRAM or the deterministic framebuffer.

Never crop source graphics merely to make a CRT shader look correct. Design essential
content inside the safe area, while allowing intentional background decoration to
continue toward the active-picture edges.

## Practical safe area

- Treat tile columns 2 through 29 as the default safe region for important content.
- Keep HUD values, menu choices, aiming targets, collision decisions, and required
  sprite details inside that region.
- Edge decoration, terrain entering the screen, and transient effects may extend
  farther when losing them does not change play.
- There is no universal exact crop for every physical television. The nominal rule
  is a design guard, not a claim that the VDP produces fewer than 256 pixels.

Hardware and presentation evidence lives in `docs/TMS9918A-CRT-OVERSCAN.md`.

## Minimal compressed picture

Canonical reference: `studio/examples-src/compressed-picture-demo.alexis`.

```basic
picture TitlePicture:
  pattern from "@project/title.pattern.zx0" codec zx0
  color from "@project/title.color.zx0" codec zx0
end picture

show picture TitlePicture
```

Prefer the `picture` form when the task is simply to display a complete picture. Use
explicit `asset` and `decompress` statements when individual tables, offsets, partial
screens, or repeated table thirds must be controlled.

## Choosing ZX0

ZX0 is a strong default for substantial pattern, color, name, sprite, and map data,
but choose by total cost:

```text
compressed payload + first required decoder + supporting code/data
```

For a project already using ZX0, another ZX0 asset normally pays only its payload.
For a tiny isolated block, raw or another available codec can remain smaller. Use
`tools/benchmark-bitmap-codec-corpus.mjs` for corpus measurements and
`tools/optimize-tms9918-bitmap.mjs` when equivalent PATTERN/COLOR encodings may
compress differently while rendering the same pixels.

Do not alter a custom table representation merely because it resembles a bitmap.
First prove the final 49,152 rendered color indexes are identical.

## Safe mode and VRAM workflow

- Blank or otherwise protect display updates when rewriting substantial active VDP
  tables.
- Keep pattern, color, name, sprite-pattern, and sprite-attribute destinations
  distinct.
- Do not enable NMI merely as a workaround for an unsafe transfer.
- Do not assume compile success proves the decompressor, destination, or mode setup.
- Preserve the compiler's VDP-safe NMI deferral around critical transfers.

## Canonical progression

1. `compressed-picture-demo.alexis`: smallest complete ZX0 picture.
2. `studio/examples-src/amy-chess.alexis`: compressed board patterns and repeated
   color-table thirds.
3. `studio/examples-src/great-canadian-mystery.alexis`: multiple pictures with independently compressed
   name, pattern, and color regions.
4. A selected polished game title screen for safe-area composition; choose one only
   after its current source, assets, and screenshot are runtime-validated.

Read only the initialization or picture-loading routine needed by the task, not the
entire game.

## Validation

1. Compile the project with every asset present.
2. Execute the relevant picture or transition in GearColeco.
3. Check raw 256x192 output for logical correctness.
4. Check CRT-TV presentation for hidden essential content.
5. Compare decompressed PATTERN/COLOR/NAME data or final rendered pixels against the
   source image.
6. Run `tools/test-zx0-vram-long-literal.mjs` when changing the ZX0-to-VRAM path.
7. Run `tools/test-tms9918-bitmap-optimization.mjs` when changing bitmap optimization.

## Avoid these failures

- Do not describe CRT overscan as missing emulator pixels.
- Do not bake curvature, scanlines, bloom, or phosphor masks into game assets.
- Do not place critical text in column 0 because a clean digital capture shows it.
- Do not apply flat CSS scanlines over a curved CRT presentation.
- Do not call ZX0 automatically optimal without measuring decoder cost.
- Do not accept a smaller PATTERN/COLOR pair unless rendered-pixel equivalence passes.
