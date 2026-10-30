# Amy Studio for Visual Studio Code

Develop ColecoVision and Coleco ADAM software in ordinary `.alexis` files. The extension supplies Amy syntax highlighting, project compilation, clickable diagnostics, RAM/ROM usage, generated assembly, symbols, and ROM artifacts.

## Projects

`Amy: Create Project` creates a normal folder:

    amy.project.json
    src/main.alexis
    assets/
    asm/

The JSON file contains build settings only. Game code remains in `.alexis`. External graphics, audio, assembly, and data files remain separate and can be referenced with Amy's existing `@project/...` syntax.

A minimal manifest is:

    {
      "name": "My Amy Game",
      "entry": "src/main.alexis",
      "target": "colecovision-cartridge",
      "optimization": "balanced"
    }

Opening a standalone `.alexis` file also works without a manifest. A manifest is recommended when the project has external files or target-specific settings.

## Commands

- `Amy: Create Project`
- `Amy: Compile Project`
- `Amy: Compile Project (Optimization Off)`
- `Amy: Compile Project (Aggressive)`
- `Amy: Open Generated Assembly`
- `Amy: Reveal Compiled ROM`

Build outputs are written under `.amy/build/` and should normally be ignored by version control.

The editor also reports source-level safety diagnostics before a build. In particular, a full
`update sprites` after editing sprite shadow entries requires `set sprite count N` or
`clear sprites`; otherwise the hardware sprite table can continue through uninitialized RAM even
when one emulator happens to display the intended sprites.

## Compiler versions

Every released VSIX contains a tested Amy compiler snapshot, so an extension update cannot silently depend on a changing web deployment. Set `amyStudio.compilerPath` only when deliberately testing another Amy Studio checkout. The extension and compiler communicate through the versioned `amy-compiler-report-v1` JSON protocol.

The web Studio remains the complete environment for graphical editors, conversion tools, emulator and recorder. The VS Code extension focuses first on reliable source editing and builds; those visual tools can later be exposed through dedicated webviews without changing the project format.
