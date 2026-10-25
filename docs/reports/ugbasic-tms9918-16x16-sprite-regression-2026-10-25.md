# ugBASIC Coleco/TMS9918 16x16 sprite conversion regression

Suggested upstream title: `Coleco/TMS9918 16x16 sprite conversion is mislaid after 1068bfe`

Commit `1068bfe` changes the TMS9918 sprite-converter row offset from `_width >> 4` to
`_width >> 3`. For 16x16 ColecoVision sprites loaded from PNG files, current source builds
interleave zero bytes between rows and misplace both eight-pixel halves.

- Last known-good revision: `e35e6df71f311174b3a3fcffdbf6849eecea5ec4`
- First failing revision: `1068bfe55901f66fccbb9bb1f09fd2892b2ae4f3`
- Also reproduced at `79612f9` and `5bbd963`

```basic
DEFINE DEFAULT TYPE BYTE
DEFINE SCREEN MODE UNIQUE OFF
BITMAP ENABLE (16)
image := LOAD IMAGE("sprite.png")
spriteId = SPRITE(image)
SPRITE spriteId AT 120,88 COLOR WHITE ENABLE
DO
    WAIT VBL
LOOP
```

For a tested 16x16 source image, VRAM begins with these rows:

```text
actual:   00 00 00 00 00 00 0c 00 1c 00 18 00 0c 00 ...
expected: 00 00 00 0c 1c 18 0c 00 ...
```

A 16x16 TMS9918 pattern consists of 32 bytes: 16 rows for the left eight pixels, followed by 16
rows for the right eight pixels. Reverting only the stride expression to `_width >> 4` restores
the expected layout in the six-image benchmark.

Equivalent Graphics II PATTERN/COLOR foreground/background encodings are not part of this report.
They are valid when all rendered bitmap pixels remain identical. An attempted GitHub issue
submission returned `403 Resource not accessible by integration`; this report is ready for manual
submission.
