# Amy Studio Graphics Editors

Amy Studio graphics editors provide a reversible view of graphics stored in Amy source or project files. The editor does not guess ownership when saving: `editors.json` identifies the data, its interpretation, and where edited bytes return.

## Opening and creating editors

Open **Graphics Editors** from the Studio menu. If the project has no `editors.json`, create one from that menu, then edit it in **Files**. Code scanning can propose entries for recognizable data, but explicit metadata is required when bytes have several meanings or sprites compose one object.

```json
{
  "version": 1,
  "editors": []
}
```

The file is part of the project and is included on export.

## Sources and round trips

References use `{ "from": "inline|file", "name": "..." }`.

- `inline` reads Amy `data ... bytes`, `bitmap8`, or `sprite16` data. Saving rewrites the source block.
- `file` reads a project file. Supported compressed files are decoded, edited, recompressed, then decoded again to verify the saved bytes.
- `entries` identifies NAME-table, metatile, or frame data.
- Dimensions determine the required byte count. Amy Studio does not silently resize gameplay structures.

## Charset

Use `charset` for 8x8 character patterns and TMS9918 colors.

```json
{
  "name": "Game Tiles",
  "kind": "charset",
  "pattern": { "from": "file", "name": "game.pattern.zx0" },
  "color": { "from": "file", "name": "game.color.raw" },
  "baseTile": 128,
  "tileCount": 64
}
```

## Tilemaps

Use `tilemap` for a NAME-table screen, board, or level. Multiple maps can reuse one charset.

```json
{
  "name": "Level 1",
  "kind": "tilemap",
  "entries": ["Level1"],
  "canvas": [19, 21],
  "screenAt": [6, 2],
  "pattern": { "from": "file", "name": "game.pattern.zx0" },
  "color": { "from": "file", "name": "game.color.raw" },
  "baseTile": 128,
  "tileCount": 84,
  "blankTile": 32
}
```

`blankTile` is explicit because an empty cell may be `$00`, `$20`, or any project value.

## Small tile frames and metatiles

Use `metatiles` (alias `frames`) for objects made from NAME-table characters rather than a complete screen: 2x2 board pieces, a 7x3 boss, doors, explosions, or scenery.

```json
{
  "name": "Boss Fly Frames",
  "kind": "frames",
  "entries": ["BossTileFrames"],
  "frameSize": [7, 3],
  "frameCount": 3,
  "pattern": { "from": "file", "name": "game.pattern.zx0" },
  "color": { "from": "file", "name": "game.color.raw" }
}
```

Frame data stores tile numbers. Pixel artwork remains owned by the charset editor.

## Sprites

Use `sprite-patterns` for 8x8 or 16x16 patterns. Amy Studio understands the TMS9918's 16x16 quadrant order and displays one coherent sprite.

```json
{
  "name": "Flying Fly",
  "kind": "sprite-patterns",
  "pattern": { "from": "inline", "name": "FlySprite" },
  "spriteSize": [16, 16],
  "spriteCount": 2,
  "basePattern": 4,
  "spriteColor": 1
}
```

Use `patterns` when animation frames come from separate blocks or files. The editor concatenates them logically, then writes every edited byte back to its original source and codec.

```json
{
  "patterns": [
    { "from": "inline", "name": "FlySprite" },
    { "from": "inline", "name": "FlySpriteB" }
  ],
  "animation": {
    "frameMs": 120,
    "frames": [0, 1]
  }
}
```

The **Animate** toggle previews the declared frames without changing runtime code. A frame number draws one sprite. A layered frame draws several overlapping sprites:

```json
{
  "animation": {
    "frameMs": 100,
    "frames": [
      {
        "layers": [
          { "pattern": 0, "color": 6, "offset": [0, 0] },
          { "pattern": 1, "color": 15, "offset": [0, 0] }
        ]
      }
    ]
  }
}
```

Pattern is the zero-based frame inside the editor's combined sources. Offset is measured in pixels.

## Sprite color and layered objects

Sprite patterns contain one-bit pixels. Color belongs to the sprite attribute, so `spriteColor` is a preview unless an explicit source attribute binding is declared.

A two-color object uses two overlapping hardware sprites. Amy Studio cannot infer this safely from pattern bytes: overlapping sprites may be unrelated. Declare `animation.frames[].layers` with each pattern, color, and offset to preview the composition without changing ROM data. ROM Test & Debug remains the authority for scanline limits and actual sprite attributes.

## What can be inferred

Amy Studio can recognize declared data blocks, bitmap syntax, known codecs, dimensions, and straightforward VRAM uploads. It cannot safely infer artistic intent, animation order, layered sprites, blank-tile meaning, collision bounds, or effects hidden in inline ASM. `editors.json` supplies those facts without contaminating gameplay code.

## Fly Swatter

Fly Swatter defines a swatter editor plus multi-source animated editors for flying and splat frames. It also needs a 7x3 tile-based boss editor. The first three are sprite-pattern editors. The boss is a `frames` editor, not a 32x24 screen. To preview its real colors, the editor must also reference the exact charset pattern and color data used by the game.

