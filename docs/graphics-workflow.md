# Amy Studio Graphics Workflow

Amy Studio can import, preview, edit, compress, embed, and use ColecoVision graphics without requiring an external asset directory. Amy's CV Paint remains a useful optional source.

## Choose The Data Model

| Goal | TMS9918 data | Editor |
|---|---|---|
| 8x8 characters or game tiles | PATTERN and optional COLOR | `charset` |
| Screen, board, map, or level | NAME with shared PATTERN/COLOR | `tilemap` |
| Object made from characters | NAME values with shared PATTERN/COLOR | `frames` or `metatiles` |
| Hardware sprite | sprite PATTERN; color comes from attributes | `sprite-patterns` |
| Mode 2 bitmap picture | PATTERN and COLOR, optional NAME | `bitmap-screen` |

Match the editor to what the VDP displays. A tile object is not a hardware sprite, and a small metatile is not a complete screen.

## Import And Preview

1. Open **Files**, then **Picture/Graphics**.
2. Choose fit, crop/cover, or stretch.
3. Adjust brightness, saturation, contrast, smoothing, and ordered dithering while watching the converted TMS9918 preview.
4. Compare compression and select by measured total ROM cost or data size.
5. Add the generated PATTERN, COLOR, and optional NAME files to the project.

Use matching base names so Studio can group components:

```text
Title.pattern.zx0
Title.color.zx0
Title.name.raw
```

The purple eye action previews recognized pictures and tilesets. Preview filters are visual only and never modify project bytes.

## Configure Editors

Use **Graphics Editors**, **Create editors.json**, or **Scan/init editors.json** from the Studio menu. The project-local `editors.json` describes charsets, tilemaps, frames, metatiles, sprites, animations, and bitmap screens.

Scanning can identify straightforward formats and dimensions. It cannot infer animation order, layering, collision boxes, blank-tile meaning, or artistic intent. Edit `editors.json` directly when those facts matter. See [Amy Studio Graphics Editors](amy-graphics-editors-guide.md) for its schema.

Editors preserve source ownership: inline Amy data returns to source, project files are replaced, and compressed files are decoded, edited, recompressed, then decoded again to verify the saved bytes.

## Use A Picture

```basic
picture TitleScreen:
  pattern from "@project/Title.pattern.zx0" codec zx0
  color from "@project/Title.color.zx0" codec zx0
end picture

show picture TitleScreen
```

Use `show picture` for managed mode setup, upload, and display. Use `upload picture` when the game must control NMI, display state, sprites, or timing itself.

## Optimize Carefully

Compression comparisons must separate asset bytes, first-use decompressor bytes, total ROM cost, and expected Z80/VDP speed. Browser compression time is not Z80 decompression time.

The optional CLI bitmap optimizer creates separate candidates and never overwrites its inputs:

```text
node tools/optimize-tms9918-bitmap.mjs --help
```

Lossless mode preserves every rendered color index. Controlled mode is explicitly lossy and uses visible pixel and color-distance limits. Equal-size or larger candidates are rejected.

## Verify The Result

1. Compile the real project at its intended optimization level.
2. Preview grouped project files for palette and layout mistakes.
3. Run the ROM in **Open ROM / Debugger**.
4. Inspect NAME, PATTERN, COLOR, sprite attributes, and VDP registers when output differs.
5. Test NTSC and PAL timing when decompression or animation occurs during gameplay.

An editor preview proves the bytes can be interpreted. Emulation proves the game uploaded them to the correct VRAM tables with the correct VDP state.
