# Amy Studio

Amy Studio is a browser-based ColecoVision development environment built around the Amy language, a Z80-oriented language for writing small games, demos, graphics tests, sound experiments, and cartridge ROMs.

The project is maintained by Amy Bienvenu and carries forward a long ColecoVision toolchain heritage: graphics tools, sound tools, compression codecs, runtime routines, and practical game-development conventions refined over decades of homebrew work.

## Repository And Documentation

- [Amy Studio Home](https://amypurple.github.io/AmyStudio/)
- [Open Amy Studio](https://amypurple.github.io/AmyStudio/studio/)
- [Public Documentation](https://amypurple.github.io/AmyStudio/docs/)
- [ColecoVision Toolchain Comparison](https://amypurple.github.io/AmyStudio/comparison.html)
- [Development Quality Pipeline](docs/development-quality-pipeline.md)
- [Amy Studio on GitHub](https://github.com/amypurple/AmyStudio)
- [Amy Language Reference](docs/amy-language.md)
- [Amy Studio Heritage](docs/amy-studio-heritage.md)
- [ColecoVision Essentials](docs/colecovision-essentials.md)

The same documentation is available directly inside Studio from the **Docs** tab.

## What Is Included

This public repository is the runnable Amy Studio release. It intentionally contains only the files needed to use Studio in a browser:

- The Studio web app.
- The Amy compiler, transpiler, optimizer, and runtime modules used by the web app.
- The in-browser assembler and supported compression codecs used by Studio.
- The Z80 runtime ASM sources referenced by generated projects.
- The documentation shown inside Studio.
- A curated example catalog covering text, sprites, input, collisions, pictures, music, algorithms, CVBasic-style plotting, and small complete games.

Development audits, old failed attempts, broad research notes, large emulator source trees, and the full private development workspace are intentionally not part of this clean release.

## Run Locally

Serve the repository root with any static HTTP server, then open `/studio/`.

```sh
python -m http.server 8080
```

Then open:

```text
http://localhost:8080/studio/
```

## ROM Test And Debug

The clean build includes a self-hosted GearColeco WebAssembly test core and the ROM TEST & DEBUG workspace. It supports external or compiled ROMs, frame rewind and replay, instruction stepping and step-over, Amy source and conditional breakpoints, CPU/VDP/stack/RAM/VRAM inspection, symbols, controller profiles, audio, and routine cycle profiling.

The `studio/bios/` folder is intentionally shipped without a BIOS ROM. Add your own legally obtained ColecoVision BIOS locally. BIOS-dependent integration tests can use the `AMY_COLECO_BIOS` environment variable.

The CDN emulator remains available as a compatibility backend; the large upstream emulator source tree is not part of this clean release.

## Credits And AI Assistance

Amy Bienvenu is the project owner, maintainer, designer, and historical source of the ColecoVision knowledge behind Amy Studio.

Claude made significant development contributions to the technical foundations Amy Studio relies on, especially the Amy Z80 assembler work, ASM investigations, and JavaScript compression codec implementations.

OpenAI Codex was used as the primary Amy Studio integration assistant: compiler/transpiler changes, JavaScript UI work, example cleanup, runtime wiring, optimizer integration, documentation cleanup, and repository preparation.

Where an AI assistant materially contributed to a specific commit, that contribution may appear in commit metadata.

AI assistance does not replace authorship or maintainership: technical direction, acceptance, testing, and release decisions belong to Amy Bienvenu.
