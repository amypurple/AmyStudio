# Amy Studio MegaCart project layout

The reference project follows the proven CVBasic MegaCart organization while keeping banks visible as project files.

- The final physical 16 KB bank is permanently mapped at `$8000-$BFFF`. It contains the cartridge header, startup, NMI, shared runtime, game state, and bank-selection helpers.
- A selected physical bank is mapped at `$C000-$FFBF`. The last 64 bytes, `$FFC0-$FFFF`, are mapper addresses and are not data capacity.
- Reading `$FFC0 + bank` selects a physical bank. This read is a hardware side effect and must never be removed as an apparently unused load.
- Amy logical `BANK 1` corresponds to physical bank 0, matching CVBasic's user-facing numbering.
- Bank-local labels can share `$C000` addresses, so symbols must carry a bank identity. A plain 16-bit pointer is insufficient outside the selected bank.
- NMI code, generic decompression entry points, and code that changes banks belong in the fixed area. Data such as scenes, graphics, dialogue, levels, and music are the safest first banked resources.

The initial reference uses separate `fixed.asm`, `bank1.asm`, and `bank2.asm` files. Amy now accepts `bank rom 128` and `bank select 1`. The declaration is exported as MegaCart compiler metadata, and selection emits a protected mapper-read helper that survives every optimization level.

`bank n` is reserved as the section-boundary syntax chosen in the earlier architecture study. Until the bank-aware linker can maintain repeated `$C000` symbols, Amy rejects it with a specific diagnostic and requires switchable banks to remain separate project outputs. This avoids creating a flat ROM that only appears banked.

The project manifest remains authoritative for bank-file ownership and final IDE packaging.

## 64 KB compatibility form

ColecoDS and GearColeco can distinguish a 64 KB MegaCart-style image from the Activision 64 KB mapper when the image has no cartridge header in physical bank 0 and has `55 AA` in the final fixed bank. Amy Studio therefore accepts `bank rom 64` and tests a four-bank image in GearColeco. This is a compatibility format rather than the conservative hardware default: documentation for physical MegaCart boards commonly recommends a 128 KB image, duplicating 64 KB content when necessary.

## Studio project build

The New Project dialog creates one `fixed-bank` output and editable `switchable-bank` ASM files in `project.amy.json`. The normal Compile button now assembles those outputs and packages the complete MegaCart ROM. Logical project bank 1 maps to physical mapper bank 0, matching `bank select 1` and CVBasic.

Switchable outputs currently accept ASM sources or binary assets. Multiple ASM source files in one output are assembled together in manifest order, so only the first file should establish `org $C000`; following files may continue with labels and data. Bank-local Amy compilation and cross-bank Amy symbols remain linker work rather than being simulated with unsafe global addresses.
