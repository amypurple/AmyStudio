# Amy Studio Clean

This is a clean runnable Amy Studio distribution generated from the development workspace.

It intentionally contains only:

- The Studio web app.
- The Amy compiler/transpiler/runtime modules needed by the web app.
- The in-browser assembler and compression codecs used by Studio.
- The Z80 runtime ASM sources referenced by generated projects.
- The small documentation set shown inside Studio.
- A curated example catalog that shows text, sprites, input, collisions, pictures, music, algorithms, CVBasic-style plotting, and complete small games.

It intentionally excludes experiments, audits, old failed attempts, full historical sources, large emulator source trees, and the broad development example corpus.

## Run

Serve the repository root with any static HTTP server, then open `/studio/`.

```sh
python -m http.server 8080
```

Then open:

```
http://localhost:8080/studio/
```

## Emulator

The clean build uses the EmulatorJS CDN backend. Local emulator source trees and cores are not included. The `studio/bios/` folder is intentionally shipped without a BIOS ROM; add your own ColecoVision BIOS locally if your run workflow requires it.
