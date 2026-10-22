# In the Caverns of Carnage

Amy Studio port of "The Cavern Monsters" from *Timelost: A Computer
Adventure* by Kris Austen Andrews, Arlan Keith Andrews Sr. and Joseph C.
Giarratano (Que, 1983).

This edition starts directly on a ZX0-compressed TMS9918A Graphics II title.
The game uses a CRT-safe playfield, two alternating name tables for smooth
vertical scrolling, a compact high-score HUD, three creature types, trapdoors,
safe passages and the book's 10,000-point escape objective.

Either joystick moves the couple horizontally and through a guarded 16-pixel
vertical range; fire shoots. Five lives make the opening rounds more forgiving.
The cave occupies rows 3-23 and columns 2-29, leaving the overscan edges and two
upper rows unused while reducing each scrolling-page rebuild to 21 rows. Creature
spacing remains challenging, with roughly one prospective spawn in six omitted
to provide occasional breathing room.

Build:

```powershell
node tools/amyc.mjs examples/ports/books/caverns/caverns.alexis `
  --project-dir examples/ports/books/caverns `
  --opt balanced --rom artifacts/caverns/caverns.rom
```

The editable title tables are exposed through `editors.json`; the ROM uses the
corresponding ZX0-compressed copies.
