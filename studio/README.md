# Amy Studio (Web)

This is an offline, static web app that:
- Stores a project (source + selected libs/compression/assets) in `localStorage` and via JSON import/export.
- Tracks a memory profile so generated projects can share one RAM/ROM contract.
- Transpiles Amy source to Z80 ASM.
- Generates a single `.asm` file that includes:
  - selected `include/*.inc`
  - selected `src/compression/*.asm` codecs
  - embedded project files via `incbin`
- Reuses deterministic JavaScript copied from:
  - `RetroCompress-Lite` for compression engines
  - `AmysCVSoundStudio` for sound table ASM parsing/dumping
- Compiles via **AmysCVAssembly** in the browser.
- Provides a Files tab for embedded assets:
  - raw and compressed project files referenced with `@project/...`
  - DSound audio import/preview
  - grouped Coleco picture previews for `.pattern/.color/.name` and `.pc`
  - browser image import to grouped `.pattern.zx0` + `.color.zx0` picture assets

## Run
- Recommended: run `powershell -File tools/serve-studio.ps1`, then open `http://localhost:8080/studio/`.
- Directly opening `studio/index.html` may be blocked by browser module/CORS rules.

## Current Graphics Asset Path

1. Open the Files tab.
2. Click `Add Files`.
3. Select a PNG/JPEG/GIF/BMP/WebP image or a Coleco `.pc` picture file.
4. Choose the import codec when prompted:
   - `raw` keeps uncompressed `.pattern` and `.color` files
   - `zx0`, `zx7`, `dan2`, `dan1`, `dan3`, or `rle` compress each component
5. Studio converts/splits the picture into grouped `name.pattern` and
   `name.color` project files, with the selected codec extension when used.
6. Use `Preview` to inspect the decoded picture, then `Picture` to insert the
   `picture Name:` block and `show picture Name`.
