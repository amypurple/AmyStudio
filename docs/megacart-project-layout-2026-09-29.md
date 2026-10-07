# Amy Studio MegaCart project layout

The reference project follows the proven CVBasic MegaCart organization while keeping banks visible as project files.

- The final physical 16 KB bank is permanently mapped at `$8000-$BFFF`. It contains the cartridge header, startup, NMI, shared runtime, game state, and bank-selection helpers.
- A selected physical bank is mapped at `$C000-$FFBF`. The last 64 bytes, `$FFC0-$FFFF`, are mapper addresses and are not data capacity.
- Reading `$FFC0 + bank` selects a physical bank. This read is a hardware side effect and must never be removed as an apparently unused load.
- Amy logical `BANK 1` corresponds to physical bank 0, matching CVBasic's user-facing numbering.
- Bank-local labels can share `$C000` addresses, so symbols must carry a bank identity. A plain 16-bit pointer is insufficient outside the selected bank.
- NMI code, generic decompression entry points, and code that changes banks belong in the fixed area. Data such as scenes, graphics, dialogue, levels, and music are the safest first banked resources.

The reference uses separate fixed and switchable output files. Amy accepts
`bank rom 128` and `bank select 1`. Selection emits a protected mapper-read
helper that survives every optimization level. A switchable output may contain
ASM, binary data, or restricted bank-local Amy procedures and ROM `data`.

`bank n` is reserved as the section-boundary syntax chosen in the earlier architecture study. Until the bank-aware linker can maintain repeated `$C000` symbols, Amy rejects it with a specific diagnostic and requires switchable banks to remain separate project outputs. This avoids creating a flat ROM that only appears banked.

The project manifest remains authoritative for bank-file ownership and final IDE packaging.

## 64 KB compatibility form

ColecoDS and GearColeco can distinguish a 64 KB MegaCart-style image from the Activision 64 KB mapper when the image has no cartridge header in physical bank 0 and has `55 AA` in the final fixed bank. Amy Studio therefore accepts `bank rom 64` and tests a four-bank image in GearColeco. This is a compatibility format rather than the conservative hardware default: documentation for physical MegaCart boards commonly recommends a 128 KB image, duplicating 64 KB content when necessary.

## Studio project build

The New Project dialog creates one `fixed-bank` output and editable
`switchable-bank` ASM/Amy files in `project.amy.json`. The normal Compile button
assembles those outputs and packages the complete MegaCart ROM. Logical project
bank 1 maps to physical mapper bank 0, matching `bank select 1` and CVBasic.

Multiple ASM source files in one output are assembled together in manifest
order, so only the first file should establish `org $C000`; following files may
continue with labels and data. Bank-local Amy deliberately rejects top-level
execution and mutable global initialization. Public procedures and data are
listed in the output's `exports`, then fixed Amy code may use:

```amy
call bank 2, Bank2Setup
copy Bank2Data from bank 2 count 8 to vram.name
copy Bank2Data from bank 2 count 8 to BankBuffer
decompress mdkrle Bank2Compressed from bank 2 to vram.name + 32
```

These operations use fixed-bank trampolines and restore the caller's bank.
Parameters, function returns, and arbitrary implicit cross-bank references are
still rejected rather than being simulated with unsafe flat addresses.
