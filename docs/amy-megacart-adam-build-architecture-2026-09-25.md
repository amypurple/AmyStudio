# Amy Studio MegaCart and ADAM Build Architecture

## Scope

MegaCart cartridge banking and ADAM memory/media support are separate targets.
They must not share a `BANK` implementation merely because both systems expose
switchable memory.

## ColecoVision MegaCart

### Verified hardware layout

- ROM sizes are 128, 256, 512, or 1024 KB, divided into 16 KB physical banks.
- CPU `$8000-$BFFF` always maps the final physical 16 KB bank.
- CPU `$C000-$FFFF` maps one selectable physical bank and starts on bank zero.
- Reading or writing `$FFC0-$FFFF` selects the low six address bits as the bank.
- Smaller ROM sizes use only the address bits supported by their bank count.
- The fixed bank must contain the cartridge header, startup, NMI handler, mapper
  helpers, and any code that must remain callable while another bank is active.

CVBasic confirms this layout. Its assembler output uses `FORG` for the physical
file position and `ORG` for the logical Z80 address. Its bank footer reserves
`$FFBF-$FFFF`; byte `$FFBF` identifies the bank and the last `$40` bytes remain
`$FF`, allowing reads in the mapper selection range.

### Implemented assembler foundation

AmySCVAssembly provides two independent location counters:

- `ORG address`: changes the logical Z80 address used by labels and fixups.
- `FORG offset`: advances the physical output position without changing the
  logical address and fills skipped bytes with `$FF`.

The assembler rejects backward physical movement and fills forward gaps with
`$FF`. MegaCart project outputs add bank-qualified debug metadata because every
switchable bank reuses `$C000-$FFFF`.

### Amy source syntax

The migration-friendly syntax should accept the CVBasic forms:

```amy
bank rom 128

bank select 2

bank 1
data LevelOne ...

bank 2
data LevelTwo ...
```

`bank rom` declares the build format; it is not a runtime instruction. `bank n`
assigns subsequent bankable code/data to a physical bank. `bank select n` emits
the MegaCart selection read for a constant bank.

Amy should additionally provide safe operations rather than requiring manual
selection everywhere:

```amy
call bank 2, DrawLevel
decompress LevelPicture from bank 3 to vram $0000
play music Theme from bank 1
```

These operations can save the current bank, select the required bank, perform
the operation, and restore the previous bank when appropriate.

### Compiler and linker rules

- `bank rom` must precede banked declarations and may appear only once.
- Bank size and number must be compile-time constants and in range.
- Each `bank n` section is declared once unless explicit reopening is designed.
- Fixed and switchable bank payloads must remain below the reserved mapper footer.
- NMI, startup, bank-selection helpers, and interrupt-reachable runtime code stay
  in the fixed bank.
- Direct calls, jumps, and pointers across switchable banks are compile errors
  unless routed through a bank-aware operation.
- Data references carry bank ownership; dereferencing data from an inactive bank
  is diagnosed where it can be proven.
- TinySound and other NMI consumers record the source bank and temporarily map it,
  matching CVBasic's proven music behavior.
- Final packaging emits the exact requested power-of-two ROM size and places the
  fixed image in the final 16 KB block.

### Validation milestone

Do not publish the language feature until an automated 128 KB ROM test proves:

1. GearColeco recognizes the image as MegaCart.
2. Startup executes from the fixed final bank.
3. Code selects at least two switchable banks and reads distinct signatures.
4. NMI continues correctly while each bank is selected.
5. Save state, rewind, breakpoints, disassembly, and source mapping retain bank
   identity.

## Coleco ADAM

### Target abstraction required first

Amy Studio currently treats the language program, ColecoVision cartridge
startup, OS7 services, and `.rom` packaging as one product. Native ADAM support
requires these layers to be separated:

1. **Amy language**: procedures, types, control flow, data, graphics, sound, and
   portable input concepts.
2. **Machine profile**: ColecoVision or ADAM memory map, firmware services,
   devices, controllers, keyboard, and available RAM.
3. **Program image**: cartridge-resident code, ADAM executable loaded into RAM,
   overlay, or data-only file.
4. **Delivery media**: `.rom`, MegaCart image, `.dsk`, `.ddp`, or a directory of
   independently built files.

The compiler must therefore stop injecting a cartridge header and fixed `$8000`
startup merely because the source language is Amy. Startup/runtime selection
comes from the selected build target.

Suggested project targets are:

```text
colecovision-cartridge
colecovision-megacart
adam-native-program
adam-disk
adam-data-pack
```

An `adam-disk` or `adam-data-pack` target owns several build outputs. Each output
can itself be compiled from several Amy modules, assembler modules, and assets.
For example, one project can build `BOOT`, `GAME`, `LEVELS`, and `MUSIC`, then
place those four EOS files on one disk.

Cartridge-only source declarations require explicit treatment:

- `cartridge` is valid only for cartridge targets and becomes metadata rather
  than a universal program declaration.
- OS7 calls are supplied by a ColecoVision runtime backend; native ADAM programs
  use EOS-compatible backends or direct hardware implementations as appropriate.
- Cartridge ROM assets become either embedded program-image data or separately
  packaged ADAM files according to the output recipe.
- Absolute ROM pointers cannot cross ADAM files. File resources use a typed file
  handle/resource declaration and are loaded before use.
- Startup, NMI, RAM layout, stack location, and termination behavior belong to
  the program-image target, not to the Amy grammar.

Portable Amy commands such as sprites, VRAM updates, PSG sound, arithmetic, and
ordinary controller input can remain unchanged when their capability exists on
both machines. Commands that require OS7, EOS, ADAM keyboard, AdamNet, disk, or
MegaCart banking must declare that capability and fail clearly on incompatible
targets.

### Build model

ADAM output is a media project, not a large cartridge. Project metadata should
choose `adam-disk` or `adam-data-pack` and describe files independently of the
Amy source language:

```json
{
  "target": "adam-disk",
  "volume": "MY GAME",
  "boot": "game.alexis",
  "files": [
    { "source": "levels.zx0", "name": "LEVELS", "type": "data" }
  ]
}
```

The builder owns boot blocks, EOS directory entries, allocation, interleave,
file lengths, load addresses, and the final `.dsk` or `.ddp` artifact. The
existing native Amy boot proof is useful, but its fixed cartridge payload is a
compatibility bridge rather than the final ADAM application model.

### Language/runtime surface

ADAM-specific capabilities should be explicit and typed:

- Keyboard events and key constants for the ADAM keyboard, separate from the
  ColecoVision controller keypad.
- AdamNet device discovery and status.
- EOS file open/read/write/close operations.
- Block I/O for advanced programs.
- Disk and data-pack device selection.
- ADAM memory configuration primitives, isolated from MegaCart selection.
- Distinct Computer Reset and Game Reset behavior in the debugger.

Raw ports and EOS calls remain available through assembly, but normal Amy code
should not need to know device control blocks or undocumented memory maps.

### Dynamic ADAM memory maps

ADAM does not have one static application memory map. The MIOC divides the Z80
address space into lower and upper 32 KB halves and selects each independently:

- lower: SmartWriter/EOS ROM windows, main RAM, expansion RAM, or OS-7 plus main RAM;
- upper: main RAM, open bus, expansion RAM, or cartridge.

EOS software can copy firmware bytes into main RAM, switch to a RAM mapping, and
continue executing the now-writable copy. A compiler profile must therefore
describe the required MIOC state and any RAM regions initialized from firmware;
it must not classify `$E000-$FFFF` permanently as ROM. Linker/debugger addresses
need a source identity (`main-ram`, `expansion-ram`, `eos-rom`, `os7-rom`,
`smartwriter-rom`, or `cartridge`) in addition to the logical Z80 address.

Memory-map transitions need dedicated runtime helpers. Such a helper must run
from a region that stays visible across the transition, disable interrupts when
required, update the debugger-visible map state, and reject a mapping that would
remove the executing code or stack.

This MIOC operation is not the same operation as selecting a bank inside the
mapped device. Mapping `cartridge` into the upper 32 KB only exposes the
cartridge bus; a cartridge mapper may then select one of its ROM banks. Likewise,
mapping expansion RAM exposes the expansion window, while RAM cards larger than
64 KB require an additional hardware addressor and their own bank selection.

The compiler must consequently distinguish these operations instead of calling
all of them `bank`:

```text
adam memory map <configuration>    MIOC lower/upper 32 KB source selection
rom bank <number>                  mapper owned by the selected ROM/cartridge
expansion ram bank <number>        addressor owned by a large RAM expansion
adam device ...                    AdamNet or interface-card protocol
```

Only `rom bank` should be shared conceptually with ColecoVision MegaCart, and
even then the mapper implementation must be selected by the declared cartridge
hardware. Amy Studio must not assume that every ADAM cartridge uses MegaCart.

### Expansion model

ADAM projects need a hardware requirements manifest independent of source files:

```json
{
  "hardware": {
    "required": ["adam-keyboard", "disk-1"],
    "optional": ["adamlink-modem", "64k-expansion-ram"],
    "cartridgeMapper": null
  }
}
```

The initial support matrix should distinguish:

- built-in 64 KB intrinsic RAM;
- one 64 KB expansion-RAM window;
- cartridge ROM and its declared mapper;
- expansion ROM/boot PROM;
- AdamNet keyboard, printer, disk, and Digital Data Pack devices;
- ADAMLink modem and later serial-interface cards;
- large 256 KB–1 MB RAM expansions requiring an addressor;
- optional third-party storage, serial, parallel, speech, and video hardware.

Unknown modules must remain explicit unsupported requirements. Silently treating
an expansion ROM as open bus or a banked RAM card as the basic 64 KB expander
would produce software that passes emulation but fails on hardware, or vice versa.

The conservative native EOS profile reserves `$D390-$FFFF` for the mutable EOS
copy described by Coleco's technical reference. A separate OS-7/super-game
profile may retain only the required EOS device services at `$F400-$FFFF`,
leaving `$2000-$F3FF` for the program while OS-7 remains visible at
`$0000-$1FFF`. Amy Studio must not silently choose the reduced profile because
software using overwritten EOS routines would fail.

### ADAM validation milestone

The first native target should boot a small Amy program from disk, read a second
named file through EOS, accept ADAM keyboard input, and save a file on writable
media. The same test must run after reset, save state, and rewind in the bundled
GearColeco core.

## Delivery order

1. Completed: implement and test `FORG` without changing ordinary cartridges.
2. Completed: add 64/128 KB MegaCart fixtures and emulator regression tests.
3. Completed: add bank-aware debug symbols, breakpoints, traces, and mapper inspection.
4. In progress: `bank rom` and `bank select` are public; project outputs now
   accept restricted bank-local Amy modules, while monolithic `bank n` remains reserved.
5. Next: add explicit imports/exports, safe banked calls, data decompression, and TinySound integration.
6. Continue MegaCart project examples and documentation, then port validated work
   to the clean repository.
7. Define the ADAM project manifest and media builder independently.
8. Add native EOS file and keyboard APIs, followed by multi-file examples.
