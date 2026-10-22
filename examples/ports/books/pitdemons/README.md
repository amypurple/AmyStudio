# Peril of the Pitdemons

Amy Studio port of the program from *Timelost: A Computer Adventure* by Kris
Austen Andrews, Arlan Keith Andrews Sr. and Joseph C. Giarratano (Que, 1983).

This edition starts directly on a full-screen TMS9918A Graphics II title image.
Its two Tiny Sound channels both loop after 869 NTSC frames. The player can move
and fire across every pit column, including column 28 at the far-right edge.

Build:

```powershell
node tools/amyc.mjs examples/ports/books/pitdemons/pitdemons.alexis `
  --project-dir examples/ports/books/pitdemons `
  --opt balanced --rom artifacts/pitdemons/pitdemons-fixed.rom
```

The generated source artwork is preserved as `pitdemons-title-source.png`.
`pitdemons-title.pattern.raw` and `pitdemons-title.color.raw` are editable Mode 2
tables; the game uses their ZX0-compressed counterparts.
