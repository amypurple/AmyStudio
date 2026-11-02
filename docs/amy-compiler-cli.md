# Amy Compiler Command Line

`tools/amyc.mjs` compiles one Amy source file with the same compiler and Z80 assembler used by Amy Studio.

```powershell
node tools/amyc.mjs game.alexis --output --asm --opt balanced
```

Run `node tools/amyc.mjs --help` for the authoritative, version-matched option list.

## Outputs

| Option | Meaning |
|---|---|
| `--output [path]` | Write the compiled ColecoVision `.rom` or ADAM `.bin`. `--rom` remains an alias. |
| `--asm [path]` | Write generated Z80 assembly. |
| `--optimized-asm [path]` | Write assembly after optimizer passes. |
| `--symbols [path]` | Write debugger symbols. |
| `--report-json path` | Write the machine-readable build result and diagnostics. |

Paths in square brackets are optional. Without one, the output is written beside the source. Parent directories are created automatically. Compilation and the ROM/RAM report still run when no output option is selected.

## Build Options

| Option | Accepted values | Default |
|---|---|---|
| `--opt` | `auto`, `off`, `safe`, `balanced`, `aggressive`, `experimental` | `balanced` |
| `--target` | `colecovision-cartridge`, `colecovision-megacart`, `adam-native-program`, `adam-disk`, `adam-data-pack` | `colecovision-cartridge` |
| `--medium` | `dsk`, `ddp`; ADAM targets only | target-dependent |
| `--memory-profile` | `colecovision-cartridge`, `colecovision-megacart`, `colecovision_legacy_sdcc`, `adam-eos-application`, `adam-os7-eos-drivers` | target-dependent |
| `--project-dir` | Directory containing files referenced as `@project/...` | none |
| `--hardware` | See the hardware list below; repeatable | none |
| `--define` | Compile-time symbol; repeatable | none |

`--opt on` remains a compatibility alias for `--opt aggressive`.

### Optimization Profiles

- `auto`: selects Safe for Tiny Sound sources and Balanced otherwise.
- `off`: no assembler optimization; useful for generated-ASM debugging.
- `safe`: conservative local peepholes.
- `balanced`: recommended size/safety profile and the CLI default.
- `aggressive`: adds more speculative size optimization; validate the ROM.
- `experimental`: enables the least conservative transformations; requires runtime testing.

### Optional Hardware

Repeat `--hardware` when a build uses more than one device:

```text
sgm, sgm1, adam-sound-enhancer, adamlink,
eve-serial, orphanware-serial, micro-serial, microinnovations-serial
```

### ADAM Targets

The CLI compiles the program payload for ADAM targets and emits a `.bin` by default. Complete `.dsk` and `.ddp` multifile media packaging remains an Amy Studio project operation.

## Examples

```powershell
# ColecoVision ROM, ASM, symbols and JSON report
node tools/amyc.mjs game.alexis `
  --output build/game.rom `
  --asm build/game.asm `
  --symbols build/game.sym `
  --report-json build/game.json

# Aggressive SGM build with a source feature symbol
node tools/amyc.mjs game.alexis --opt aggressive --hardware sgm1 --define DEBUG --output

# Native ADAM payload
node tools/amyc.mjs app.alexis --target adam-native-program --medium dsk --output
```

Unknown options, invalid values, missing values and extra positional arguments are rejected. Exit code `0` means success, `1` means compilation/assembly failure, and `2` means invalid command-line use.

## Advanced Options

`--disable-opt-pass id` disables one named optimizer pass and may be repeated. `--experimental-record-ix` enables experimental record-array IX generation. These are compiler-development controls, not recommended release defaults.
