# Amy Compiler Command Line

`tools/amyc.mjs` compiles an Amy source file or a multifile ColecoVision MegaCart project with the same compiler, linker and Z80 assembler used by Amy Studio.

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
| `--report-jr-candidates` | List shorten-able user-ASM `jp` instructions and their one-byte gains. |

Paths in square brackets are optional. Without one, the output is written beside the source. Parent directories are created automatically. Compilation and the ROM/RAM report still run when no output option is selected.

## Build Options

| Option | Accepted values | Default |
|---|---|---|
| `--opt` | `auto`, `off`, `safe`, `balanced`, `aggressive`, `experimental` | `balanced` |
| `--target` | `colecovision-cartridge`, `colecovision-megacart`, `colecovision-fujinet`, `adam-native-program`, `adam-disk`, `adam-data-pack` | `colecovision-cartridge` |
| `--medium` | `dsk`, `ddp`; ADAM targets only | target-dependent |
| `--memory-profile` | `colecovision-cartridge`, `colecovision-megacart`, `colecovision-fujinet`, `colecovision_legacy_sdcc`, `adam-eos-application`, `adam-os7-eos-drivers` | target-dependent |
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

### Multifile MegaCart Projects

Pass a `.amy.json` project manifest directly to build one complete banked ROM:

```powershell
node tools/amyc.mjs project.amy.json --output build/game.rom --opt balanced
```

The manifest must declare `target.platform` as `colecovision-megacart`, one
`fixed-bank` output whose first source is Amy, and any required
`switchable-bank` outputs. Switchable sources may be Amy (`kind: "amy"`), Z80
assembly (`kind: "asm"`), or binary assets (`kind: "asset"`). Paths are
resolved beside the manifest; Studio-exported manifests containing base64
`projectFiles` also work. Exported Amy/ASM symbols satisfy `call bank N, Name`
imports and the linker generates bank-switch/restore trampolines automatically.

`--asm` and `--optimized-asm` write the linked fixed-bank listings. `--symbols`
writes bank-qualified debugger symbols. The final `.rom` contains every bank;
no separate bank files need to be joined manually.

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

# Multifile 128K MegaCart project
node tools/amyc.mjs megacart-game.amy.json --output build/megacart-game.rom --symbols build/megacart-game.sym
```

Unknown options, invalid values, missing values and extra positional arguments are rejected. Exit code `0` means success, `1` means compilation/assembly failure, and `2` means invalid command-line use.

## Advanced Options

`--report-jr-candidates` does not relax ordinary `asm {}` blocks. It reports each candidate as
opaque, applied by `asm relax`, or protected by `.timed`; use `safe` or a higher profile because
`--opt off` does not run the address-dependent analyzer.

`--disable-opt-pass id` disables one named optimizer pass and may be repeated. `--experimental-record-ix` enables experimental record-array IX generation. These are compiler-development controls, not recommended release defaults.
