# In the Caverns of Carnage

Amy Studio port of "The Cavern Monsters" from *Timelost: A Computer
Adventure* by Kris Austen Andrews, Arlan Keith Andrews Sr. and Joseph C.
Giarratano (Que, 1983).

This edition starts directly on a ZX0-compressed TMS9918A Graphics II title.
The game uses a CRT-safe playfield, two alternating name tables for smooth
vertical scrolling, a compact high-score HUD, three creature types, trapdoors,
safe passages and the book's 10,000-point escape objective.

Build:

```powershell
node tools/amyc.mjs examples/ports/books/caverns/caverns.alexis `
  --project-dir examples/ports/books/caverns `
  --opt balanced --rom artifacts/caverns/caverns.rom
```

The editable title tables are exposed through `editors.json`; the ROM uses the
corresponding ZX0-compressed copies.
