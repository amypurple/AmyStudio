# Amy Studio Workflow

## Goal
Use `studio/index.html` as the main Amy Studio environment for authoring source, generating ASM, compiling ROMs, managing embedded project assets, and testing the resulting cartridge.

## Steps
1. Run `powershell -File tools/serve-studio.ps1`.
2. Open `http://localhost:8080/studio/` in your browser.
3. Write Amy source in the main editor.
4. Optionally add embedded project files in the `Files` tab.
5. Reference embedded files from source with the `@project/...` path prefix.
6. Use `Transpile`, `Generate ASM`, or `Compile ROM` according to the verification required.
7. Run the compiled cartridge in `Open ROM / Debugger` when behavior, graphics, input, sound, or timing matters.

`Transpile` validates Amy and emits generated assembly. `Generate ASM` prepares the assembly views and artifacts. `Compile ROM` assembles and links a runnable cartridge. A transpile success is not proof that the ROM boots or behaves correctly.

## Project Import And Export

The preferred exported project name ends in `.amy.json`. Amy Studio also recognizes older `.json` projects by validated content and accepts gzip-compressed `.amy.json.gz` or `.json.gz` projects. Files may be selected through **Import Project** or dropped directly onto the Studio page.

Duplicate browser download names such as `game.amy (1).json` remain importable because recognition is content-based. Import validates the project structure and embedded file data before replacing the active project.

Embedded files are part of the project export. A project does not share its private files with another `.amy.json` project unless those bytes are intentionally copied.

## Project, Files, And Docs Tabs

The left panel is split into:

- `Project`: project name, examples, compile/RAM summaries, and ROM actions
- `Files`: embedded project files, asset snippets, picture previews, and audio/voice import shortcuts
- `Docs`: live Amy language and ColecoVision documentation loaded from the repo, with document selection, reload, and local search

## Compile Status
The status box is intentionally compact. A successful compile reports the ROM
size, symbol count, selected optimization profile, main byte savings, and
whether BIOS previews or emulator actions are available.

Compiler hints are summarized as `Hints: N` in the small status box. Use the
generated ASM/log output when you need the full diagnostic text.

## Embedded Files
Amy Studio can keep binary and text assets inside the exported `.amy.json` project file instead of requiring a separate disk path at compile time.

Example:

```basic
asset SpeechData from "@project/intro.dsound"
play dsound SpeechData
```

Notes:
- Embedded project files are emitted inline into the generated ASM as `db` bytes.
- Regular filesystem assets still use `incbin` and are unchanged.
- Existing demos and optimizer behavior are not altered unless a project explicitly references `@project/...`.
- The `Files` tab has a direct `Audio/Voice` shortcut to the DSOUND workflow.
- Editable embedded ASM/text files and `editors.json` can be opened directly from `Files`.
- Adding, replacing, editing, or removing a project file invalidates the previous build.
- `codec raw` is implied when the `asset` statement omits a codec.

## Picture Files And Preview
Coleco bitmap pictures are handled as grouped VDP components. Use the same base
name plus a component suffix so Studio can pair the files for preview:

- `Title.pattern.zx0`
- `Title.color.zx0`
- `Title.name.raw` or no name file when the default bitmap name table is fine

The same convention works with other supported codecs, including `.dan2`:

- `CommandoTitle.pattern.dan2`
- `CommandoTitle.color.dan2`

When you import a browser image or a 12288-byte `.pc` picture through the
`Files` tab, Studio converts it to `pattern`/`color` picture components and
opens a compression chooser. The chooser compares each candidate by:

- compressed pattern bytes
- compressed color bytes
- decompressor routine bytes linked on first use
- total first-use ROM cost
- bytes saved versus raw picture data

Use `Best total` when the picture is the only user of that codec. Use
`Smallest data` when the decompressor is already linked elsewhere or when you
are comparing pure asset payload size.

For responsiveness, the first import pass compares raw plus five quick codecs:
`mdkrle`, `nibble`, `bitbuster`, `zx7`, and `dan1`. Use `Compare all codecs` when you want
the slower exhaustive pass, including stronger but slower compressors such as
`zx0`.

Browser image imports first show a preparation step for the image conversion:
`fit`, `cover/crop`, or `stretch`, plus brightness, saturation, and smoothing.
Those controls are applied before the Coleco/TMS9918 palette quantization.
The same step includes a live ColecoVision preview rendered from the generated
`pattern`/`color` tables, not from the original browser image. Contrast and
ordered dithering controls are available there too, so visual tuning happens
before the compression comparison step.

Compression comparison uses browser workers when available. Each non-raw codec
can run in parallel; `raw` is shown immediately. If workers are blocked or not
available, Studio keeps the sequential fallback.

BitBuster note: the JavaScript codec implementation is named `bitbuster12` in
RetroCompress Lite, but Amy source and project files use the simpler
`bitbuster` name.

Typical Amy source:

```basic
picture TitleScreen:
  pattern from "@project/Title.pattern.zx0" codec zx0
  color from "@project/Title.color.zx0" codec zx0
end picture

show picture TitleScreen
```

Use `show picture Name` when you want the all-in-one path: bitmap mode setup,
component upload/decompression, default name-table preparation when needed, and
display enable. Use `upload picture Name` when your program wants to manage
screen state, NMI, sprites, or timing itself.

Preview notes:
- Studio previews pictures by matching a shared base name before `.pattern`,
  `.color`, `.name`, or `.pc`.
- If one half of a pattern/color pair is missing, Studio cannot render the full
  picture preview and the project should be fixed before relying on it.
- Current preview/decompression support covers raw, RLE-family assets, ZX0,
  ZX7, DAN1, DAN2, DAN3, Pletter, LZF, Bitbuster, and compatible `.pc` picture
  files.

## Audio/Voice → DSound
The integrated `Audio/Voice → DSound` tool now supports three workflows:
- load a browser-supported audio file (`.wav`, `.mp3`, `.ogg`, `.m4a`, and similar decodeable formats)
- insert an Amy `data ... end data` block directly into source
- save the generated dsound bytes as an embedded project file for later use with `play dsound`
- record a short microphone clip directly in the browser, then convert that recording to dsound

Recommended dsound workflow:
1. Fastest path:
   - choose an audio file and click `Quick add file to Amy`
   - or record a microphone clip and click `Quick add recording to Amy`
2. Manual path:
   - open `Advanced conversion options`
   - convert first
   - then `Save as project file` or `Save + insert play snippet`
3. If you saved without auto-insert, add the asset line and `play dsound Label` in source.

There is also now a built-in example:
- `DSound Voice Minimal`
  - it ships with a tiny embedded `.dsound` project file so the full asset-based workflow compiles immediately

## Tiny Music Project Files
Converted tiny-music data can also live in the `Files` tab and be referenced
with `@project/...` from an `asset` statement or an included ASM source. Prefer
embedded files for demos that should compile in the browser without a local
filesystem layout.
