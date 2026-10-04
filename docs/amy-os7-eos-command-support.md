# Amy command support by runtime target

Status: active engineering matrix  
Last verified: 2026-10-03

## Purpose

This document tracks whether an Amy language operation is implemented and
runtime-tested for ColecoVision OS-7, hybrid ADAM OS7+EOS, and native ADAM EOS.
Syntax recognition alone does not count as target support.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `VERIFIED` | Compiles and has a GearColeco runtime test for this target. |
| `COMPILES` | Target-specific code is emitted and assembles, but runtime evidence is incomplete. |
| `PARTIAL` | A useful target path is runtime-tested, but important behavior remains unverified or unsupported. |
| `SHARED` | Pure language operation; generated code has no OS-7 or EOS dependency. |
| `HYBRID` | Supported only while OS-7 remains mapped and EOS supplies selected ADAM services. |
| `PLANNED` | Syntax exists, but the target backend is not implemented. |
| `N/A` | The operation deliberately does not apply to this target. |
| `REJECT` | The compiler must issue a target-specific diagnostic. |

## Compatibility rules

- Existing OS-7 output is the compatibility baseline. Adding EOS support must
  not increase any existing OS-7 ROM or alter its required libraries.
- Native EOS code calls stable EOS jump-table entries, not private firmware
  implementation addresses.
- A command without a native EOS backend must fail compilation for a native EOS
  target. It must never silently emit an OS-7 call.
- `COMPILES` is not promoted to `VERIFIED` without an emulator checkpoint that
  checks the affected RAM, VRAM, sound, controller, or media state.
- The detailed inventory is derived from
  `studio/core/editor/autocompleteCatalog.js` and the statement handlers under
  `studio/core/compiler/`. Documentation examples are not authoritative by
  themselves.

## Target-aware conditional compilation

Amy Studio now resolves one canonical build context before transpilation. A
legacy project without target metadata remains `colecovision-cartridge`; a
`project.amy.json` target takes precedence and carries its machine, memory
profile, capabilities, and optimization policy through the compiler pipeline.
Conflicting project and manifest targets produce a build warning.

The context defines compile-time symbols that do not consume RAM or ROM:

| Symbol | Defined for |
| --- | --- |
| `AMY_TARGET_COLECOVISION` | ColecoVision cartridge and MegaCart targets. |
| `AMY_TARGET_ADAM` | Native ADAM program, disk, and data-pack targets. |
| `AMY_HAS_OS7` | Targets whose runtime may call OS-7. |
| `AMY_HAS_EOS` | Code outputs whose memory profile keeps callable EOS services. Merely being packaged on DSK/DDP is insufficient. |
| `AMY_HAS_MEGACART` | MegaCart targets. |
| `AMY_HAS_ADAMNET` | Targets with native AdamNet services. |
| `AMY_HAS_FILE_IO` | Targets with native EOS file I/O. |

Example:

```text
if defined AMY_HAS_EOS
  call asm NativeEosRoutine
else defined
  call asm Os7Routine
end defined
```

This permits portable project sources today. It does **not** yet translate an
OS-7-dependent Amy command into EOS automatically.

The media container and executable ABI are deliberately separate. An
`adam-disk` or `adam-data-pack` can contain an EOS-native program, an OS-7
compatibility program, or an OS7+EOS hybrid. `adam-eos-application` and
`adam-eos-boot-block` expose EOS only; `colecovision_legacy_sdcc` on ADAM
exposes OS-7 only; `adam-os7-eos-drivers` exposes both. Consequently a hybrid
source receives both `AMY_HAS_OS7` and `AMY_HAS_EOS`, while a compatibility DSK
does not receive `AMY_HAS_EOS`. EOS block operations select device `$04` for
DSK and `$08` for DDP from the resolved medium.

This compile-time hybrid is not the same as an optional-EOS cartridge. A stock
ColecoVision cartridge must remain fully playable with OS-7 alone, then detect
an ADAM at runtime before mapping and calling any EOS service. Mapping the EOS
ROM is insufficient: its code is linked for the `$E000-$FFFF` runtime copy even
though the firmware view exposes it at `$6000-$7FFF`. Amy will not advertise
optional cartridge save/catalog support until an OS-7-safe low-RAM trampoline,
EOS-in-high-RAM detection, MIOC restore path, and GearColeco runtime test exist.
This is also distinct from MegaCart and modern SGM/SGM2 bank protocols.

## Target RAM profiles

Amy scratch and runtime addresses are target-owned; they are not portable
constants that application code should assume. The OS-7 profile keeps its
established 1 KiB-compatible layout, including `_buffer32` at `$7000`. Native
EOS applications instead reserve `AMY_BUFFER32` at `$2000`, runtime and VDP
shadow state below `$2100`, and allocate Amy variables from `$2100` through
`$2EFF`. `$2F00-$2FFF` is reserved because native startup places the stack at
`$2FF0`; a future segmented allocator may expose additional upper RAM without
crossing that stack page. Startup clears only the allocated variable span, not
the complete native EOS application window. Native generated output is regression-checked
to contain no legacy `$7000` or `$73xx` RAM references.

Native screen control now uses EOS's firmware-owned VDP register 1 shadow at
`$FD62` directly; it no longer maintains the former Amy copy at `$23C4`. EOS
also owns table pointers at `$FD64-$FD6D`; Amy now reads the corresponding EOS
entries directly instead of maintaining copies at `$23F4-$23FA`. Controller work state at
`$FE58-$FE6D`, and sound state at `$FE6E-$FE78`. Target backends call public
vectors and must not make application variables overlap these work areas.

The OS7+EOS hybrid profile retains OS-7/Amy compatibility state around `$7000`
and the cartridge-like game body at `$8000`, while EOS named-file operations
own `$4000-$4CFF`. Amy variables therefore use `$2100-$3FFF`: enough for an
`EosDirectory` and game state without colliding with either runtime.

## Current support matrix

| Amy command or family | Canonical syntax | OS-7 cartridge / MegaCart | ADAM OS7+EOS hybrid | Native EOS | Evidence or required backend |
| --- | --- | --- | --- | --- | --- |
| Project metadata | `project "My Game"` | `SHARED` | `SHARED` | `SHARED` | Compile-time metadata only. |
| Target conditionals | `if defined AMY_HAS_EOS` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Canonical target context selects branches at compile time with no emitted runtime test. |
| Cartridge metadata | `cartridge "GAME/AUTHOR/2026"` | `VERIFIED` | `N/A` | `N/A` | ColecoVision cartridge header. |
| MegaCart declaration | `bank rom 128` | `VERIFIED` | `N/A` | `N/A` | MegaCart image and runtime tests. |
| MegaCart selection | `bank select 1` | `VERIFIED` | `N/A` | `N/A` | Optimizer-protected mapper read. |
| Variables and constants | `u8 Lives = 3` | `SHARED` | `SHARED` | `VERIFIED` | Native profile allocates from `$2100`; DSK and DDP tests verify initialization and RAM contents. |
| Arrays | `u8 Map[64]` | `SHARED` | `SHARED` | `VERIFIED` | DSK and DDP tests verify three adjacent indexed writes in native EOS RAM. |
| Records and overlays | `record Actor` / `overlay memory` | `SHARED` | `SHARED` | `VERIFIED` | A 357-byte native program verifies record-array indexing, a record passed by `ref`, physical overlay aliasing, and a qualified `for each` loop on DSK/DDP. Native allocation reports 18 logical bytes in 16 physical overlay bytes. |
| Arithmetic and comparisons | `Score += 10` | `SHARED` | `SHARED` | `SHARED` | No firmware dependency after RAM allocation. |
| Control flow | `if`, `for`, `do`, `select case` | `SHARED` | `SHARED` | `SHARED` | No firmware dependency. |
| Procedures and functions | `sub Update:` | `SHARED` | `SHARED` | `SHARED` | ABI remains Amy-owned. |
| Raw ASM call | `call asm Routine` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Programmer owns target ABI; namespaces must remain explicit. A hybrid DSK runtime test passes calculated byte/word scalars and a global address through A/HL/DE, boots through EOS into OS7, and verifies both writes in RAM. |
| Screen enable without NMI | `screen on no nmi` | `VERIFIED` | `VERIFIED` | `VERIFIED` | A native Amy boot was runtime-tested from DSK and DDP. This explicit form does not claim a firmware-safe NMI hook. |
| Screen control without NMI | `screen off` / `screen on no nmi` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native DSK/DDP tests verify EOS `$FD62` against physical VDP R1. NMI-enabled `screen on` remains planned. |
| NMI enable | `screen on` / `nmi on` | `VERIFIED` | `VERIFIED` | `VERIFIED` | The native loader's MIOC `$01` contract maps writable low RAM and the resident `$C800-$DFFF` program simultaneously. Amy installs `JP AMY_EOS_NMI` at `$0066`, acknowledges the VDP directly, and preserves maskable-interrupt ownership. DSK/DDP tests prove asynchronous VBlank and a concurrent EOS block read. `screen on no nmi` retains the polling backend. |
| Display-only control | `display on` / `display off` | `VERIFIED` | `VERIFIED` | `VERIFIED` | DSK/DDP runtime tests prove EOS `$FD62/$FD20` preserve the disabled-NMI bit while toggling only display enable. |
| Text screen | `text screen` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native lowering uses EOS `$FD20/$FD29/$FD38`; DSK/DDP tests also verify the authoritative NAME-table pointer at `$FD68=$1800`. |
| Graphics II tile screen | `tile screen` | `VERIFIED` | `VERIFIED` | `VERIFIED` | DSK/DDP tests verify R0-R6, EOS table pointers, NAME output, the 2 KiB R3=`$9F` text-style color table, and all three duplicated pattern thirds. |
| Bitmap drawing screen | `bitmap screen color $F1` | `VERIFIED` | `VERIFIED` | `VERIFIED` | DSK/DDP tests verify R3=`$FF`, 6 KiB cleared patterns, 6 KiB filled colors, and three sequential NAME-table pages. |
| Picture screen | `picture screen` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Uses the verified full Graphics II setter; a DSK/DDP project asset test also loads its 6 KiB color component through ZX0. |
| Load ASCII | `load default ascii` | `VERIFIED` | `VERIFIED` | `VERIFIED` | EOS `$FD38` is used by the runtime-tested native Amy text-screen program. |
| Raw VRAM write | `copy Buffer to vram $1000` | `VERIFIED` | `VERIFIED` | `VERIFIED` | A native Amy program writes 513 RAM bytes through EOS `$FD1A`; DSK/DDP tests verify sentinels at offsets 0, 255, 256, and 512. Native lowering removes the OS-7 count correction because EOS accepts exact `BC`. |
| Raw VRAM read | `copy vram $1000 to Buffer`; `vpeek vram $1000 into Value` | `VERIFIED` | `VERIFIED` | `VERIFIED` | The DSK/DDP program reads 513 bytes through EOS `$FD1D` and verifies four scalar `vpeek` calls. Native `vpeek` uses EOS and `AMY_BUFFER32`, not OS-7 scratch `$701F`. OS-7 `vpoke/vpeek` is separately runtime-verified in all five optimizer profiles with scalar, overlay, and local-record destinations. |
| VRAM fill | `fill 0 count 768 to vram.name` | `VERIFIED` | `VERIFIED` | `VERIFIED` | EOS `$FD26`; native Amy `text screen` clears VRAM and is runtime verified. |
| VDP register access | `backdrop black`; `display on/off`; `sprites 8x8/16x16`; `sprites simple/double`; `set sprite pattern table vram.pattern` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native DSK/DDP tests verify physical R1 set/clear transitions and EOS shadow `$FD62`, R6 sprite-pattern-table selection, and physical R7 plus Amy shadow `$20E0`. |
| Literal and numeric text output | `print at 8,8, "HELLO"` / `print at 14,11, Lives` | `VERIFIED` | `VERIFIED` | `VERIFIED` | DSK and DDP tests inspect literal text and `u8` formatting through target-specific `AMY_BUFFER32` directly in VRAM. |
| Sprites | `set sprite 0 to Y,X,P,C`; `update sprites` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native EOS keeps Amy's 32-entry shadow table, masks colors like OS7, and uploads through EOS `$FD3B`; DSK and DDP VRAM tests cover the SAT pointer and `$D0` terminator. |
| Joypad input | `joypad(1).left` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native lowering calls EOS `$FD3E`, reverses EOS's table order into Amy player order, and merges direction/two fire bytes into Amy's bitfield. Both players are runtime-tested. |
| Keypad input | `keypad(1)` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native adapter maps EOS keypad `0..11` directly and converts idle `$0F` to Amy `$FF`; both players and key 5 are runtime-tested. |
| Spinner input | `enable spinner`; `spinner(1)`; `spinner(2)`; `reset spinner 1/2`; `reset spinners`; `disable spinner` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native Amy keeps maskable interrupts disabled, selects joystick segment `$C0`, calls EOS `$FD41` cooperatively, restores keypad segment `$80`, then consumes `$FE58/$FE59`. DSK and DDP tests verify both spinners in both signed directions. This avoids incorrectly entering the OS7 `$0038` handler from a native EOS application. |
| Direct PSG | `psg tone 1 period 120` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Amy-owned `$FF` backend; DSK/DDP tests verify tone, noise, volume, and nonzero PCM without OS-7/EOS sound-table state. |
| TinySound | `play song Theme` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native EOS advances Amy's sequencer and EOS `$FD59` cooperatively during `wait`. Target-specific replacements remove private OS-7 `$012F/$00FC/$0295` calls; a 1,152-byte multiblock program runs on DSK/DDP. A synchronized two-channel audit proves 48/48 scheduler and semantic BIOS-state frames equal to OS7, with nonzero audio on both targets. |
| BIOS-format sound | `set sound table Effects areas 3`; `play sound 1`; `stop sound 1`; `mute all` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native tables relocate up to 32 work areas to `$3000+`; the cooperative frame owner calls EOS `$FD59` during `wait`. DSK/DDP tests reach `$FD50/$FD56/$FD59`. A synchronized two-voice comparison proves 24/24 semantic sound-area frames equal to OS7 and nonzero PCM on both targets. |
| VoxPCM | `play voxpcm Voice`; `play voxpcm Voices[Index]` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native EOS removes the OS7 NMI/VDP wrapper, keeps interrupts disabled, and uses the same cycle-balanced stock-PSG decoder. A 664-byte program plays direct and dynamically indexed sequences from DSK/DDP, returns to Amy code, remains in the native bank, and produces nonzero PCM. An optional SGM AY backend remains separate research. |
| SGM/ADAM Sound Enhancer AY register access | `ay write Register, Value`; `ay read Register, Value`; `ay mute` | `VERIFIED` with `target.hardware: ["sgm1"]` | `VERIFIED` with explicit hardware | `VERIFIED` with `target.hardware: ["adam-sound-enhancer"]` | Uses SGM-compatible ports `$50/$51/$52`; an unexpanded target rejects it. GearColeco and ROM TEST & DEBUG provide separate `ADAM Sound Enhancer` and `Opcode SGM` profiles. The 89-byte native Amy program boots from DSK with Sound Enhancer and DDP with Opcode SGM; the OS7+EOS build boots through the real hybrid DSK loader. All runs verify AY register state and nonzero PCM. The Sound Enhancer grants only `sgm-ay`; it deliberately does not grant or map SGM RAM over ADAM's MIOC memory. |
| Frame/VBlank timing | `wait` / `wait 4 frames` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native EOS uses the stable EOS `$FD23` VDP-status service and polls bit 7 without enabling NMI or executing `HALT`. Constant and calculated 16-bit counts resume correctly from DSK and DDP while physical VDP R1 remains display-on with NMI disabled. |
| Blocking action-button waits | `wait fire`; `wait no fire`; `wait 180 frames or press`; `pause until press [and release]` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native EOS lowers each generated frame delay to EOS `$FD23` polling and samples controllers through `$FD3E`. DSK/DDP tests cover idle endurance, both controllers, immediate press completion, and press-and-release consumption while NMI stays disabled. |
| Blocking menu and keypad choices | `choose menu ...`; `choose keypad ...`; `wait key 5`; `wait key release` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native EOS lowers each frame to EOS `$FD23` polling and each input sample to `$FD3E`. DSK/DDP tests navigate down/up/down/down, confirm with FIRE, select keypad 2, then wait for keypad-2 key 5 and its release. Tile cursor output and NMI-disabled execution are verified. |
| CRT-safe pause | `pause until press and release sleep after 10 seconds` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native EOS uses cooperative `$FD23` VBlank polling and `$FD3E` controller reads without enabling NMI. DSK/DDP tests verify timeout blanking, backdrop restoration, wake-only first press, release consumption, and second-press confirmation. Stock ADAM timing uses the NTSC counter. |
| CRT-safe menu choice | `choose menu ... sleep after 10 seconds` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native EOS counts cooperative menu frames, resets on any selected-controller activity, blanks through EOS, then restores the display and consumes the wake input without selecting an entry. A 1,269-byte multiblock program verifies the complete sequence on DSK/DDP. |
| CRT-safe keypad choice | `choose keypad ... sleep after 10 seconds` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native EOS uses a self-contained `$FD23`/`$FD3E` backend. DSK/DDP tests verify timeout blanking, backdrop restoration, wake-key release consumption without selection, a subsequent valid choice, and NMI remaining disabled. |
| Amy timers and VBlank hook | `timer Pulse every 4 ticks` / `on vblank Update` | `VERIFIED` | `VERIFIED` | `VERIFIED` | With `screen on`, native EOS advances timers and `on vblank` from Amy's asynchronous `$0066` owner. DSK/DDP tests verify a repeating timer, callbacks during `wait`, and continued callbacks in a mainline busy loop. The explicit `screen on no nmi` form retains cooperative polling semantics. |
| ZX0 compression to VRAM | `decompress zx0 Data to vram.color` | `VERIFIED` | `VERIFIED` | `VERIFIED` | A 717-byte native program decodes a project asset to 6 KiB of VRAM on DSK/DDP, byte-identical to the software reference decoder. |
| ZX1 compression to VRAM | `decompress zx1 Data to vram.pattern` | `VERIFIED` | `VERIFIED` | `VERIFIED` | A multiblock native program expands independently generated pattern and color streams on DSK/DDP; GearColeco compares all 12 KiB of VRAM byte-for-byte with the source data. |
| Pletter compression to VRAM | `decompress pletter Data to vram.pattern` | `VERIFIED` | `VERIFIED` | `VERIFIED` | A native multiblock program expands 6 KiB pattern and 6 KiB color streams on DSK/DDP. GearColeco verifies all output byte-for-byte, including Pletter's timing-sensitive VRAM read/write copyback path. |
| ZX2 compression to VRAM | `decompress zx2 Data to vram.pattern` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native DSK/DDP execution expands independently generated streams into 12 KiB of byte-exact pattern and color VRAM. The same source data is also verified on OS-7 in all five optimizer profiles. |
| aPLib compression to VRAM | `decompress aplib Data to vram.pattern` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Its distinct direct-VDP copyback implementation preserves IX/IY. A 1,681-byte combined payload expands byte-exactly to 12 KiB on native DSK and DDP. |
| MegaLZ compression to VRAM | `decompress megalz Data to vram.pattern` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Its DEC40-derived direct-VDP copy loop expands a 1,815-byte combined payload to byte-exact 12 KiB output on native DSK/DDP. |
| Exomizer 2 compression to VRAM | `decompress exomizer Data to vram.pattern` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Native EOS conditionally reserves its aligned 156-byte table at `$2100-$219B` and moves user allocation to `$219C`. A 1,416-byte payload expands to exact 12 KiB VRAM on DSK/DDP; projects not using Exomizer retain the `$2100` user-RAM start. |
| ZX7 compression to VRAM | `decompress zx7 Data to vram.pattern` | `VERIFIED` | `VERIFIED` | `VERIFIED` | A 1,557-byte combined stream expands byte-exactly to 12 KiB from DSK and DDP, including its timing-padded VRAM copyback loop. |
| DAN compression to VRAM | `decompress dan1|dan2|dan3 Data to vram.pattern` | `VERIFIED` | `VERIFIED` | `VERIFIED` | All three variants have independent native DSK/DDP execution: DAN1 1,731 bytes, DAN2 1,715 bytes, and published Warrior DAN3 2,891 bytes, each expanding to exact 12 KiB. DAN3 uses published streams in the regression because optimal compression is intentionally much slower. |
| RLE compression to VRAM | `decompress mdkrle Data to vram.pattern`; `decompress rle Data to vram.pattern` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Published Warrior MDK-RLE streams expand from 3,687 bytes to exact 12 KiB on DSK/DDP. The `rle` spelling is separately compiled and executed, proving it aliases `mdkrle_decompress`. |
| LZF compression to VRAM | `decompress lzf Data to vram.pattern` | `VERIFIED` | `VERIFIED` | `VERIFIED` | A 1,700-byte combined stream expands byte-exactly to 12 KiB on native DSK/DDP. |
| BitBuster compression to VRAM | `decompress bitbuster Data to vram.pattern` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Its four-byte header and timing-sensitive direct VDP copy path are exercised; 3,611 bytes expand to exact 12 KiB on DSK/DDP. |
| Nibble compression to VRAM | `decompress nibble Data to vram.pattern` | `VERIFIED` | `VERIFIED` | `VERIFIED` | Published Warrior streams totaling 3,345 bytes expand to exact 12 KiB on DSK/DDP. |
| Compression source/destination variants | `decompress zx0 Blocks[Index] to vram.name + Offset`; `... to vram.spr_pat`; `... to vram.spr_attr`; `... to vram $1800` | `VERIFIED` | `VERIFIED` | `VERIFIED` | One indexed-source program is runtime-tested on OS7, native EOS DSK/DDP, and an `adam-os7-eos-drivers` disk using the real hybrid loader. GearColeco verifies byte-exact NAME output, sprite-pattern and sprite-attribute offsets, and an absolute VRAM destination. |
| EOS raw block access | `Buffer[Offset] = read block Block + 1 [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | Native lowering calls EOS `$FCF3`, selects ADAMnet device `$04` for DSK or `$08` for DDP from project metadata, and optionally stores normalized status 0/1. Block expressions and dynamically indexed buffers, including `u16` offsets into buffers larger than 256 bytes, are compile-tested. GearColeco verifies an exact 1,024-byte read from both media types. |
| EOS raw block writes | `block write Block + 1 from Buffer[Offset] [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | Calls EOS `$FCF6`, selects DSK/DDP from project metadata, and makes status optional. Calculated block numbers and dynamic buffer addresses are compile-tested. GearColeco verifies an exact writable-block round trip on both media. This advanced operation can overwrite filesystem structures. |
| EOS media catalog | `Count = catalog Directory [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | `EosFile` (23 bytes), `EosDirectoryEntry` (26 bytes), and `EosDirectory` (1,024 bytes) are reserved records on every EOS-capable output, including hybrids. The command reads logical block 1 directly into the directory and returns its entry count. GearColeco verifies fields and count byte-for-byte on DSK/DDP. |
| EOS named-file reads | `Buffer[Offset] = read "LEVEL1" count TransferSize * 2 [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | The assignment already distinguishes a file transfer from a DATA `read`, so no redundant `file` word is needed. Amy accepts calculated counts and dynamic buffer addresses, initializes a private EOS FCB/file workspace at `$4000-$4CFF`, then opens, reads, and always closes the file through `$FCC0/$FCD2/$FCC3`. EOS EOF `$0A` after a completed transfer is normalized to success. Exact 768-byte DSK/DDP payloads are runtime-verified. |
| EOS named-file overwrite | `write "SAVE" from Buffer[Offset] count TransferSize * 2 [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | Uses a direct verb and optional status. Calculated counts and dynamic buffer addresses are compile-tested. It opens an existing allocated file in write mode, writes through `$FCD5`, and closes it. A 16-byte write/readback cycle is exact on writable DSK and DDP media. |
| EOS named-file creation | `create "SAVE" Bytes [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | Uses the direct verb style familiar from ADAM and CP/M commands without redundant `file`/`size` words. Calls EOS `$FCC9` with a 16-bit expression or all four bytes of a `u32` size. A 70,000-byte allocation lifecycle and a complete create/write/read cycle are runtime-verified on writable DSK and DDP. |
| EOS file metadata | `Found[Index] = find "SAVE" as Files[Index] status Status[Index]`; `Sizes[Index] = size Files[Index]` | `REJECT` | `VERIFIED` | `VERIFIED` | DSK/DDP runtime tests verify dynamic `EosFile` array addresses, indexed byte/u32 results, indexed statuses, a cleared missing record, and an exact 1,500-byte size. The backend preserves EOS's filename pointer while the shared Amy address generator computes `Files[Index]`. |
| EOS named-file existence | `Exists = exists "SAVE" [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | The assigned query needs no redundant `file` prefix and calls EOS `$FCCC`. Error `$05` is normalized to the ordinary result `Exists=0, status=0`; other EOS failures return status 1. Runtime coverage verifies absent, present, then deleted on DSK/DDP. |
| EOS typed file metadata | `Found = find "SAVE" as FileInfo [status Result]`; `Bytes = size FileInfo` | `REJECT` | `VERIFIED` | `VERIFIED` | Calls `$FCCC` directly into the built-in 23-byte `EosFile`. A missing name returns false/status 0 and clears the record; media failure returns false/status 1. The record size form computes a `u32` value without more media I/O. DSK/DDP tests verify the complete record, typed fields, and 1,500-byte result. |
| EOS named-file size | `Size = size "SAVE" [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | The assigned query requires a `u32` destination and calls EOS `$FCCC`. Amy computes `(used blocks - 1) * 1024 + final-block bytes` from the returned 23-byte directory record. GearColeco verifies a 70,000-byte file, an empty file, and missing-file status on DSK/DDP. |
| EOS named-file rename | `rename "OLD" to "NEW" [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | Uses the SmartBASIC verb and Amy's readable `to` direction. Calls EOS `$FCDE`; runtime coverage verifies create, write, rename, old-name failure, new-name payload, and deletion. |
| EOS named-file deletion | `delete "SAVE" [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | Matches SmartBASIC's direct `DELETE name` convention and calls EOS `$FCE1`. Runtime coverage verifies deletion and failure of the following reopen on DSK/DDP. |
| EOS date | `EosDate Today`; `set date Today`; `Today = date [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | The three-byte system record stores `Year`, `Month`, and `Day`. Amy calls EOS `$FCD8/$FCDB` with the verified `B/C/D` ABI, clears the record on an unset-date error, and reports normalized status. A 154-byte program verifies an exact `86/10/2` round trip on DSK/DDP. |
| Native multi-block program loading | automatic media build | `N/A` | `VERIFIED` | `VERIFIED` | Amy Studio emits a one-block first stage, loads up to 6 KiB into `$C800-$DFFF`, and selects ADAMnet device `$04` for DSK or `$08` for DDP. A 3,184-byte four-block game is runtime-tested on both. |
| ADAM keyboard, blocking | `KeyCode = await key [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | `await` makes blocking explicit. Earlier `get key into` and `adam read key into` experiments were removed. Calls EOS `$FC6C`; GearColeco verifies blocking, ASCII `a`, optional status 0, and continuation. |
| ADAM keyboard, asynchronous | `R = key start [status S]` / `K = key poll R status S` | `REJECT` | `VERIFIED` | `VERIFIED` | Amy exposes EOS `$FCA8/$FC4B` with explicit request storage and statuses 0=ready, 1=pending, 2=error. `$FC93` is `key reset [status S]`. GearColeco verifies reset, start, 120 pending frames, ASCII `b`, and continuation. |
| ADAMnet system records | `AdamNetPcb Pcb`; `AdamNetDcb Request` | `REJECT` | `VERIFIED` | `VERIFIED` | EOS-capable targets reserve typed 4-byte PCB and 21-byte DCB layouts matching GearColeco/EOS. Native DSK/DDP execution verifies every layout boundary, the `u32 Block` field, copying a DCB into the live PCB, copying its completion response back, and continued Amy execution. The real OS7+EOS hybrid loader independently verifies the same DCB round trip and `$96` completion response. Records cost no ROM or RAM unless instantiated. |
| Generic ADAMnet devices | `submit Request to Slot [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | `Request` must be an `AdamNetDcb`; `Slot` may be a byte expression and must be below the live PCB `DeviceCount`. Amy copies the 21-byte record to `$FEC4 + Slot*21`, waits for AdamNet's response bit, copies the completed DCB back, and reports normalized status 0/1. GearColeco verifies the known absent-device responses `$96/$9B` and continued execution; EOS may change which one appears after rebuilding its active DCB table. |
| ADAMnet device inspection/reset | `Flags = device status Device [status Result]`; `Code = device result Device [status Result]`; `reset device Device [status Result]` | `REJECT` | `VERIFIED` | `VERIFIED` | Device IDs may be byte expressions. `$FC7E` returns device-dependent flags, `$FC75` returns the raw DCB completion code, and `$FC90` performs a soft reset; each preserves firmware register ownership and optionally reports normalized Amy status. Native DSK/DDP and the real OS7+EOS hybrid loader verify keyboard `$80` completion, status/reset, generic absent-device completion, and continued execution. Stock OS7 rejects all three commands. |
| ADAM printer | `print "AMY" to printer [status S]` | `REJECT` | `VERIFIED` | `VERIFIED` | Amy lowers a string literal to one ETX-terminated EOS `$FC63` transfer; a scalar byte uses `$FC66`. Both services handle AdamNet busy `$86`. GearColeco verifies the exact `AMY` plus CR spool, status 0, and continuation on DSK/DDP. |
| ADAM serial byte I/O | `Present = serial present`; `Ready = serial readable`; `Byte = serial read`; `serial write Byte`; `Connected = serial carrier` | `N/A` | `VERIFIED` | `VERIFIED` | `target.hardware` selects `adamlink`, `eve-serial`, or `micro-serial`; source remains port-independent. Native execution verifies absence, readiness, RX/TX, continuation and carrier. Real AdamLink III corrected an earlier reversed assumption: data is `$5E`, status/control is `$5F`; its initialization no longer pollutes TX, and it consumes injected data. The SCN2651 model now distinguishes asserted DSR bit 7 from active-low DCD bit 6. Eve remains `$44/$45`; MIB3 carrier is input `$1D` bit 5. |
| ADAM modem protocols | emulator hardware option | `N/A` | `PARTIAL` | `PARTIAL` | The underlying Amy serial API is verified, including hardware presence, readiness, RX/TX, carrier, three hardware profiles, loopback, and save states. Untouched AdamLink III completes both directions against scripted peers. SEND transfers a real 2,560-byte EOS file as 20 checksum packets through EOT; RECEIVE requests CRC mode, accepts two CRC-16 packets, ACKs EOT, creates `RXTESTA`, and writes the exact 256-byte payload into a new EOS block. Error tests prove bad-CRC NAK/retry, idempotent duplicate-block ACK and double-CAN handling. A mid-transfer save state resumes into a byte-identical EOS file. No-peer timeout retries `C`, falls back to NAK, sends CAN, reports failure and closes a zero-length partial file. The optional deterministic Hayes backend handles `AT`, `ATD`, `ATH`, `OK`, `CONNECT`, `NO CARRIER`, and `ERROR`, including mid-command save-state restoration. Baud/framing timing remains open. |

## Engineering progress log

### 2026-10-04: native EOS asynchronous VBlank ownership

- Proved the loader's actual MIOC `$01` mapping with an isolated assembly boot:
  writable `$0066`, the resident `$C800` program, and EOS remain accessible at
  the same time. DSK and DDP both complete EOS `$FCF3` block reads while VDP
  NMI continues asynchronously.
- Added the native Amy NMI owner and enabled `screen on` / `nmi on` for EOS.
  The handler acknowledges VDP status directly, preserves both register sets
  through the frame service, and does not enable the incompatible maskable
  `$0038` path.
- Split frame waits by explicit display contract. NMI-enabled programs use
  `HALT`; `screen on no nmi`, menus, and input-only programs retain EOS `$FD23`
  polling. This avoids both double frame ticks and a dead wait after the NMI
  handler has consumed VDP status.
- Runtime-verified asynchronous timers and `on vblank` callbacks on DSK/DDP,
  including progress after Amy enters a busy loop. Existing no-NMI waits,
  action waits, menus, keypad choices, TinySound, and BIOS sound regressions
  remain green.

### 2026-10-03: native serial byte I/O

- Added explicit ADAM hardware profiles `adamlink`, `eve-serial`, and
  `micro-serial`; each enables the common `AMY_HAS_SERIAL` capability.
- Added non-blocking `serial readable`, `serial writable`, `serial read`, and
  `serial write` operations. AdamLink and Eve/Orphanware also support
  `serial carrier` with the verified active-low SCN2651 DCD bit.
- Added `serial present`; a native EOS test compiled for AdamLink now runs
  against an emulator with no serial card and safely skips all byte I/O.
- Kept all port addresses and status masks out of Amy game code. Recompiling
  the same source for another declared interface selects its backend.
- Runtime-tested all three profiles through a native EOS boot disk, AdamLink
  through DDP, and AdamLink through the real hybrid loader: byte `$41` is
  received, byte `$42` is captured from transmit, readiness is normalized,
  and Amy execution continues. OS7 cartridge output fails closed.
- MIB3 Carrier Detect is now verified from the board manual as input-port
  `$1D` bit 5 and runtime-tested through raw I/O and compiled Amy code.
- UART configuration and baud/framing timing remain outside this first layer;
  hardware presence, Hayes commands and XMODEM are now covered below.

### 2026-10-03: generic AdamNet device inspection

- Runtime-verified `AdamNetPcb` and `AdamNetDcb` through the real OS7+EOS
  hybrid loader, promoting the hybrid record support from `COMPILES` to
  `VERIFIED`.
- Added `Flags = device status Device [status Result]` through EOS `$FC7E`,
  preserving `IY` while returning the device-dependent DCB flags.
- Added `Code = device result Device [status Result]` through `$FC75`, keeping
  the raw completion code distinct from Amy's normalized optional status.
- Added `reset device Device [status Result]` through `$FC90`.
- Native DSK, native DDP, and hybrid DSK tests verify keyboard status, raw `$80`
  completion, soft reset, absent-device completion, DCB copyback, and continued
  execution. OS7-only compilation rejects all three commands.
- Deliberately did not expose EOS `$FC8A` as a simple `scan devices` command.
  The firmware routine clears and rebuilds the live DCB table and contains two
  unbounded waits marked `NEED PROTECTION HERE` in the EOS source. A future
  discovery API requires timeout, active-request exclusion, and recovery tests.

### 2026-10-02: typed EOS date service

- Added the built-in three-byte `EosDate` record with `Year`, `Month`, and `Day`.
- Added `set date Today` and `Today = date [status Result]` using the verified
  EOS `$FCD8/$FCDB` register contracts.
- Unset-date failure clears the destination and returns normalized status 1.
- Runtime-tested the exact date round trip from native DSK and DDP programs.
- OS7 targets neither reserve `EosDate` nor accept the EOS date statements.

### 2026-10-02: complete EOS 6 firmware map

- Expanded Amy Studio's EOS firmware map from 61 consumed vectors to all 101
  entries in the verified EOS 6 jump table at `$FC30-$FD5C`.
- Preserved the historical names for the five disabled/default vectors at
  `$FD02-$FD0E` rather than assigning invented behavior.
- Verified that the local 8 KiB `EOS.ROM` is byte-identical to the independently
  reconstructed EOS 6 bank, MD5 `01df3140909f09aa9aac4f88890f676c`.
- Added a regression that proves exact one-to-one vector coverage, the Amy-used
  service addresses, PCB/DCB locations, and EOS-owned VDP RAM state.
- This is metadata and test coverage only: generated OS7 and EOS programs do not
  grow, and no OS7 lowering path changes.

### 2026-10-02: generic AdamNet DCB submission

- Added `submit Request to Slot [status Result]` for EOS-capable targets.
- The slot accepts a runtime byte expression and is checked against the live
  PCB `DeviceCount`; stock EOS currently configures five active DCB entries.
- The completed DCB is copied back so `CommandStatus`, `NodeStatus`, reported
  maximum length, and transferred byte count remain available as typed fields.
- Verified a non-specialized device request end to end on DSK and DDP: AdamNet
  returns `$96` from DSK and `$9B` from DDP; Amy copies the raw response into
  `Request.CommandStatus`, reports normalized failure,
  and continues execution.

### 2026-10-02: native EOS VDP register family

Completed:

- Inventoried every public Amy statement that directly configures the VDP
  registers: screen and display control, graphics modes, backdrop, sprite size,
  sprite magnification, and sprite-pattern-table selection.
- Added separate native EOS set-bit and clear-bit programs. This prevents a
  final-state-only test from hiding a broken R1 bit transition.
- Confirmed that target specialization rewrites the sprite configuration
  runtime from the OS-7 R1 shadow `$73C4` to EOS's authoritative `$FD62`.
- Runtime-tested both programs from DSK and DDP. GearColeco observes R1=`$C3`
  for display-on, 16x16, magnified sprites; R1=`$80` for display-off, 8x8,
  non-magnified sprites; R6=`$00` for `vram.pattern`; and R7=`$07` for cyan.
- Compared EOS `$FD62` and Amy's R7 shadow `$20E0` with the physical VDP
  registers after execution. Both shadows match the hardware state.
- Confirmed that the optimizer removes sprite configuration writes that are
  overwritten before an observable use. The runtime assertions therefore
  inspect the set and clear paths in separate final states.
- Re-ran target ABI routing, firmware-map, existing native display, and sprite
  code-generation regressions. All pass.
- Re-ran the complete balanced OS-7 example audit: 233/233 examples assemble,
  with the unchanged 1,183,532-byte baseline total.
- Added a cross-target indexed ZX0 regression. The same Amy program writes
  byte-exact data to NAME, sprite-pattern plus offset, sprite-attribute plus
  offset, and absolute VRAM destinations on OS7, native EOS DSK, and native EOS
  DDP.
- Fixed the modern `colecovision-cartridge` and `colecovision-megacart` target
  IDs so the RAM allocator resolves them to the established legacy layout. A
  standalone Amy source with variables no longer reaches assembly with an
  undefined `AMY_RAM_LIMIT` merely because it omitted an explicit `memory`
  directive.
- Enabled non-CRT `choose menu` and `choose keypad` for native EOS. Generated
  menu waits are routed through EOS VDP-status polling and controller reads;
  keypad choice is emitted inline so no late-linked OS7 `HALT` remains.
- Found and fixed an EOS-only register-lifetime bug during keypad release:
  polling uses `DE`, so the selected key is now preserved on the stack rather
  than in `D`. Runtime tests navigate and confirm on both DSK and DDP.
- Routed `wait key N` and `wait key release` through the same EOS frame and
  controller polling backend. Player-2 key 5 and release are runtime-tested on
  DSK and DDP.
- Routed plain `pause until press` and `pause until press and release` through
  the same cooperative EOS backend. DSK/DDP tests verify immediate press,
  held-button blocking for the release form, both controllers, and NMI staying
  disabled.
- Added a native CRT-safe timed pause without claiming `$0066`. On stock ADAM
  timing it blanks through EOS while preserving NMI-off state, restores the
  display and backdrop on the first post-timeout press, consumes its release,
  and requires a second press-and-release to confirm. DSK and DDP execute the
  complete timeout/wake/confirm sequence.
- Added the cooperative native `choose menu ... sleep after` backend. Its
  DSK/DDP test crosses the one-block boundary, boots through the real
  multiblock loader, blanks after inactivity, wakes without selecting, and
  resumes ordinary directional navigation.
- Added the native `choose keypad ... sleep after` backend and made its runtime
  dependency explicit so a keypad-only program links correctly. DSK/DDP tests
  blank after inactivity, consume the first keypad wake without selecting,
  restore the backdrop, and accept the next in-range key with NMI still off.
- Added a native EOS cooperative frame owner. Every VBlank consumed by Amy
  `wait` now updates declared timers and invokes `on vblank` while preserving
  both Z80 register sets and preventing callback re-entry. DSK/DDP execution
  verifies ten hooks, a repeating three-tick timer, and NMI remaining disabled.
- Fixed a late-runtime specialization gap: target capabilities were passed to
  the generated program body but lost when the selected Amy runtime was
  rendered. The final EOS `AMY_WAIT_FRAMES_SAFE` now receives the same timer,
  hook, and frame-counter capabilities as the preamble.
- Connected BIOS-format sound to the cooperative owner. A native program now
  advances EOS `$FD59` once for each VBlank consumed by Amy `wait`, gated by
  `AMY_SOUND_ENABLED`; the DSK/DDP regression no longer contains a manual ASM
  sound tick.
- Fixed the previously uncovered singular `wait 1 frame` path by assigning the
  native EOS frame counter to `$20DD-$20DE`, below user RAM and immediately
  before the `$20DF` frame-service re-entry guard.
- Added the first native EOS TinySound backend. It allocates two scheduler slots
  at the non-overlapping `$20B1-$20C0` and `$20E1-$20F0` ranges, advances
  `AMY_UPDATE_MUSIC` before EOS `$FD59`, and replaces
  private OS-7 attenuation/frequency sweeps with Amy-owned equivalents derived
  instruction-for-instruction from the documented BIOS routines. The obsolete
  OS-7 `$0295` pointer refresh is removed because EOS `PLAY_IT` refreshes its own
  channel pointers.
- Runtime-tested a 1,152-byte TinySound program through the native multiblock
  loader on DSK and DDP. Its stream pointer advances, execution completes after
  24 cooperative VBlanks, NMI stays disabled, and generated code contains none
  of `$012F`, `$00FC`, or `$0295`.
- Found and fixed a native RAM overlap exposed by two-channel fidelity testing:
  the original second TinySound slot crossed `$20D0-$20D9`, corrupting Amy's
  sound and music state. Slots now occupy separate free ranges
  `$20B1-$20C0` and `$20E1-$20F0` and are cleared independently.
- Added a synchronized OS7/EOS fidelity audit. It resets the shared frame
  counter immediately before playback, then compares two channels for 48
  frames. TinySound scheduler state and semantic BIOS sound state are both
  48/48 byte-equivalent after normalizing relocated callback pointers and
  dormant frequency-sweep bytes. Both targets produce nonzero PCM. Raw sample
  streams are not expected to be cycle-identical because OS7 updates from NMI
  while native EOS advances cooperatively after its firmware VBlank poll.
- Extended the generated EOS service disassembly through `$E617`. The previous
  `$E500` boundary truncated the SPECIAL-04 parser. The complete reference now
  shows the EOS parser, effect copier, and dynamic PSG-port writer and confirms
  their structural equivalence with the OS7 sound engine.
- Added an independent BIOS-format sound parity test, separate from
  SPECIAL-04. Two simultaneous tone voices produce 24/24 equal semantic
  sound-area frames and nonzero PCM under both OS7 and EOS. The comparison
  retains active duration/sweep state and normalizes only reload bytes that
  each BIOS intentionally leaves unspecified while the corresponding sweep is
  disabled.
- Found a general Z80 optimizer defect while tracing native TinySound:
  `PUSH AF / RLD|RRD / POP AF` was incorrectly treated as redundant even
  though `RLD` and `RRD` modify `A` and flags. The optimizer now treats both
  instructions as implicit `AF` clobbers. The affected peephole is shared by
  Safe, Balanced, Aggressive, and Experimental; dedicated tests now protect
  the flag-preserving sequence at every enabled level. The native
  attenuation sweep now changes `$24,$22` to `$24,$21`, rather than disabling
  the sweep as `$00,$22`.
- Corrected native EOS spinner ownership. The shared OS7 helper enabled
  maskable interrupts and could enter the incompatible `$0038` handler. Native
  EOS now keeps interrupts disabled and polls `$FD41` cooperatively. DSK/DDP
  tests verify both spinners in both signed directions; the smoke program also
  shrank from 162 to 159 bytes.
- Added target-aware VoxPCM lowering. Native EOS omits the OS7 NMI and VDP
  shadow wrapper while retaining the cycle-balanced stock-PSG decoder. Direct
  and dynamically indexed sequences execute on DSK/DDP, return to Amy code,
  remain in the native application bank, and produce nonzero PCM.
- Promoted the indexed compression destination matrix from compile-only to
  runtime-verified for OS7+EOS. The test builds an `adam-os7-eos-drivers` ROM,
  packages it with the real hybrid disk loader, boots it in ADAM mode, and
  verifies byte-exact NAME, sprite-pattern, sprite-attribute, and absolute
  VRAM destinations alongside the existing OS7 and native EOS runs.
- Added reserved `AdamNetPcb` and `AdamNetDcb` records to every EOS-capable
  target. Their 4-byte/21-byte layouts follow the emulated firmware contract,
  including device command/status, transfer address and length, 32-bit block,
  retry, maximum-length, device-type, and node-status fields.
- Fixed general scalar assignment to `u32`/`i32` record fields. A five-profile
  OS7 runtime regression now verifies wide literals and field/scalar/field
  round trips; the EOS record test separately protects the DCB offsets.

In progress or still open:

- TinySound and BIOS-format sound now have semantic scheduler/state parity and
  nonzero PCM evidence. Exhaustive sample-level waveform equivalence remains
  open because OS7 updates from NMI while native EOS advances cooperatively.
- Native EOS timers and VBlank callbacks now have asynchronous semantics when
  `screen on` enables NMI. CRT-safe pause, menu, and keypad forms remain
  verified through cooperative EOS polling when the source explicitly keeps
  NMI disabled.
- Real AdamLink III now provides executable modem evidence rather than only
  menu reachability. The deterministic probe aliases an existing 2,560-byte
  EOS ASCII document in a private media copy, selects it through AdamLink's
  FILE/XMODEM/DISK I/A workflow, synchronizes on the program's UART-ready poll,
  injects NAK, validates and acknowledges all 20 packets, compares the complete
  2,560-byte payload with the selected EOS file, and acknowledges EOT.
  GearColeco's SCN2651 status now exposes both TxRDY and TxEMT.
- AdamLink XMODEM receive is also verified end to end. The peer observes the
  initial `C` request, supplies two CRC-16/XMODEM packets and EOT, and verifies
  every ACK. A new read-only media-export bridge then confirms EOS created
  `RXTESTA` and persisted the exact 256-byte payload in the mounted DSK image.
- Its receive error path is deterministic: corrupt CRC yields NAK, a corrected
  retransmission yields ACK, a duplicate block is ACKed without duplication,
  and double CAN leaves a named zero-length EOS file when accepted data had not
  yet filled AdamLink's 1 KiB disk buffer.
- A state captured after block 1 restores the live protocol and writable DSK;
  block 2 and EOT then create byte-identical `RXSAVEA`. With no peer, AdamLink
  emits five total `C` requests, five NAK retries and CAN over 4,135 NTSC
  frames (about 69 seconds), reports failure, and closes `RXTIMEA` at zero bytes.
- Native EOS VoxPCM now executes direct and indexed stock-PSG sequences from
  DSK/DDP with nonzero PCM. Perceptual comparison with OS7 remains research.
  AY is not part of an unexpanded ADAM, but GearColeco now emulates separate
  Opcode SGM and ADAM Sound Enhancer profiles. Native Amy DSK/DDP execution,
  register state, and nonzero PCM are verified for native DSK/DDP and the
  OS7+EOS hybrid DSK path.
- Generic AdamNet device requests are runtime-verified on native DSK/DDP and
  hybrid media. The public Amy serial API and all three hardware profiles are
  runtime-verified. Real AdamLink XMODEM send and receive are verified end to
  end. Deterministic Hayes command/result traffic is verified; physical
  baud/framing timing remains pending.
- ROM TEST & DEBUG now reads serial state directly from GearColeco and displays
  the selected interface, carrier, RX/TX queue sizes, Hayes/loopback mode, and
  the length of an unfinished Hayes command. The same exported state is covered
  while `ATD` is partially entered, so the inspector cannot silently diverge
  from the save-state-capable emulator core.

The remaining `PARTIAL` row has an explicit completion criterion:

1. Modem protocols become `VERIFIED` after baud/framing timing joins the
   completed Hayes and real-software XMODEM send, receive, retry,
   cancellation, timeout and in-flight save-state proofs.

## Regression gates

The extended Alexis-Z80 baseline captured before native EOS backend work contains
233 assembled examples and 1,183,532 total balanced-profile ROM bytes. The
public clean repository has a separate 78-example baseline of 309,450 bytes.
After promotion, all 78 still assemble and total 309,464 bytes: the only growth
is two deliberate seven-byte initializations of the CRT-safe menu inactivity
counter in Where On Earth? and 3D Solar System. This prevents stale RAM from
blanking either menu prematurely; all other OS7 examples remain byte-identical.
Detailed local audits are written under `build/` and are not release artifacts.
The 2026-10-04 post-NMI audit assembles the current 234-example Alexis catalog
with 0 failures and 1,183,773 balanced-profile bytes. The catalog gained one
example since the earlier 233-example snapshot; the EOS-only NMI backend does
not alter the OS7 generation path.

Every backend change must run:

```text
node tools/check-examples.mjs --assemble --optimization balanced
node tools/test-project-targets.mjs
node tools/test-compile-time-conditionals.mjs
node tools/test-native-eos-generator.mjs
node tools/test-firmware-maps.mjs
node tools/test-native-eos-frame-wait.mjs
node tools/test-native-eos-frame-service.mjs
node tools/test-native-eos-tinysound.mjs
node tools/test-native-eos-system-records.mjs
node tools/test-wide-record-fields-rom.mjs
node tools/test-tinysound-os7-eos-parity.mjs
node tools/test-native-eos-indexed-file-records.mjs
node tools/amyc.mjs studio/examples-src/adam-native-amy-smoke.alexis --target adam-native-program --rom build/adam-native-amy-smoke.bin --opt safe
node tools/test-native-eos-amy-output.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-display-smoke.alexis --target adam-native-program --asm build/adam-native-eos-display-smoke.asm --rom build/adam-native-eos-display-smoke.bin
node tools/amyc.mjs studio/examples-src/adam-native-eos-display-off-smoke.alexis --target adam-native-program --asm build/adam-native-eos-display-off-smoke.asm --rom build/adam-native-eos-display-off-smoke.bin
node tools/test-native-eos-amy-display.mjs
node tools/test-native-eos-vdp-registers.mjs
node tools/test-cross-target-compression-destinations.mjs
node tools/test-native-eos-choices.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-tile-screen-smoke.alexis --target adam-native-program --asm build/adam-native-eos-tile-screen-smoke.asm --rom build/adam-native-eos-tile-screen-smoke.bin
node tools/test-native-eos-amy-tile-screen.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-bitmap-screen-smoke.alexis --target adam-native-program --asm build/adam-native-eos-bitmap-screen-smoke.asm --rom build/adam-native-eos-bitmap-screen-smoke.bin
node tools/test-native-eos-amy-bitmap-screen.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-zx0-picture-smoke.alexis --target adam-native-program --project-dir assets/compressed/warrior --asm build/adam-native-eos-zx0-picture-smoke.asm --rom build/adam-native-eos-zx0-picture-smoke.bin
node tools/test-native-eos-amy-zx0-picture.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-zx0-full-picture-smoke.alexis --target adam-native-program --project-dir assets/compressed/warrior --asm build/adam-native-eos-zx0-full-picture-smoke.asm --rom build/adam-native-eos-zx0-full-picture-smoke.bin
node tools/test-native-eos-multiblock-program.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-block-read-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-block-read-dsk.asm --rom build/adam-native-eos-block-read-dsk.bin
node tools/amyc.mjs studio/examples-src/adam-native-eos-block-read-smoke.alexis --target adam-native-program --medium ddp --asm build/adam-native-eos-block-read-ddp.asm --rom build/adam-native-eos-block-read-ddp.bin
node tools/test-native-eos-amy-block-read.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-block-write-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-block-write-dsk.asm --rom build/adam-native-eos-block-write-dsk.bin
node tools/amyc.mjs studio/examples-src/adam-native-eos-block-write-smoke.alexis --target adam-native-program --medium ddp --asm build/adam-native-eos-block-write-ddp.asm --rom build/adam-native-eos-block-write-ddp.bin
node tools/test-native-eos-amy-block-write.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-file-read-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-file-read-dsk.asm --rom build/adam-native-eos-file-read-dsk.bin
node tools/amyc.mjs studio/examples-src/adam-native-eos-file-read-smoke.alexis --target adam-native-program --medium ddp --asm build/adam-native-eos-file-read-ddp.asm --rom build/adam-native-eos-file-read-ddp.bin
node tools/test-native-eos-amy-file-read.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-file-write-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-file-write-dsk.asm --rom build/adam-native-eos-file-write-dsk.bin
node tools/amyc.mjs studio/examples-src/adam-native-eos-file-write-smoke.alexis --target adam-native-program --medium ddp --asm build/adam-native-eos-file-write-ddp.asm --rom build/adam-native-eos-file-write-ddp.bin

node tools/amyc.mjs studio/examples-src/adam-native-eos-file-create-delete-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-file-create-delete-dsk.asm --rom build/adam-native-eos-file-create-delete-dsk.bin
node tools/amyc.mjs studio/examples-src/adam-native-eos-file-create-delete-smoke.alexis --target adam-native-program --medium ddp --asm build/adam-native-eos-file-create-delete-ddp.asm --rom build/adam-native-eos-file-create-delete-ddp.bin
node tools/test-native-eos-amy-file-create-delete.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-file-create-u32-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-file-create-u32-dsk.asm --rom build/adam-native-eos-file-create-u32-dsk.bin
node tools/amyc.mjs studio/examples-src/adam-native-eos-file-create-u32-smoke.alexis --target adam-native-program --medium ddp --asm build/adam-native-eos-file-create-u32-ddp.asm --rom build/adam-native-eos-file-create-u32-ddp.bin
node tools/test-native-eos-amy-file-create-u32.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-file-exists-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-file-exists-dsk.asm --rom build/adam-native-eos-file-exists-dsk.bin
node tools/amyc.mjs studio/examples-src/adam-native-eos-file-exists-smoke.alexis --target adam-native-program --medium ddp --asm build/adam-native-eos-file-exists-ddp.asm --rom build/adam-native-eos-file-exists-ddp.bin
node tools/test-native-eos-amy-file-exists.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-file-size-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-file-size-dsk.asm --rom build/adam-native-eos-file-size-dsk.bin
node tools/amyc.mjs studio/examples-src/adam-native-eos-file-size-smoke.alexis --target adam-native-program --medium ddp --asm build/adam-native-eos-file-size-ddp.asm --rom build/adam-native-eos-file-size-ddp.bin
node tools/test-native-eos-amy-file-size.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-file-rename-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-file-rename-dsk.asm --rom build/adam-native-eos-file-rename-dsk.bin
node tools/amyc.mjs studio/examples-src/adam-native-eos-file-rename-smoke.alexis --target adam-native-program --medium ddp --asm build/adam-native-eos-file-rename-ddp.asm --rom build/adam-native-eos-file-rename-ddp.bin
node tools/test-native-eos-amy-file-rename.mjs

node tools/amyc.mjs studio/examples-src/adam-native-eos-keyboard-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-keyboard.asm --rom build/adam-native-eos-keyboard.bin
node tools/test-native-eos-amy-keyboard.mjs

node tools/amyc.mjs studio/examples-src/adam-native-eos-keyboard-async-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-keyboard-async.asm --rom build/adam-native-eos-keyboard-async.bin
node tools/test-native-eos-amy-keyboard-async.mjs
node tools/test-adam-printer-syntax.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-printer-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-printer-dsk.asm --rom build/adam-native-eos-printer-dsk.bin
node tools/amyc.mjs studio/examples-src/adam-native-eos-printer-smoke.alexis --target adam-native-program --medium ddp --asm build/adam-native-eos-printer-ddp.asm --rom build/adam-native-eos-printer-ddp.bin
node tools/test-native-eos-amy-printer.mjs
node tools/test-native-eos-amy-file-write.mjs
node tools/test-native-eos-system-records.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-record-overlay-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-record-overlay-dsk.asm --rom build/adam-native-eos-record-overlay-dsk.bin --opt safe
node tools/amyc.mjs studio/examples-src/adam-native-eos-record-overlay-smoke.alexis --target adam-native-program --medium ddp --asm build/adam-native-eos-record-overlay-ddp.asm --rom build/adam-native-eos-record-overlay-ddp.bin --opt safe
node tools/test-native-eos-amy-record-overlay.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-vram-buffer-smoke.alexis --target adam-native-program --medium dsk --asm build/adam-native-eos-vram-buffer-dsk.asm --rom build/adam-native-eos-vram-buffer-dsk.bin --opt safe
node tools/amyc.mjs studio/examples-src/adam-native-eos-vram-buffer-smoke.alexis --target adam-native-program --medium ddp --asm build/adam-native-eos-vram-buffer-ddp.asm --rom build/adam-native-eos-vram-buffer-ddp.bin --opt safe
node tools/test-native-eos-amy-vram-buffer.mjs
node tools/test-vpeek-qualified-rom.mjs
node tools/test-native-eos-amy-zx1-vram.mjs
node tools/test-native-eos-amy-pletter-vram.mjs
node tools/test-native-eos-amy-zx2-vram.mjs
node tools/test-native-eos-amy-aplib-vram.mjs
node tools/test-native-eos-amy-megalz-vram.mjs
node tools/test-native-eos-amy-exomizer-vram.mjs
node tools/test-native-eos-amy-zx7-vram.mjs
node tools/test-native-eos-amy-dan1-vram.mjs
node tools/test-native-eos-amy-dan2-vram.mjs
node tools/test-native-eos-amy-dan3-vram.mjs
node tools/test-native-eos-amy-mdkrle-vram.mjs
node tools/test-native-eos-amy-rle-alias-vram.mjs
node tools/test-native-eos-amy-lzf-vram.mjs
node tools/test-native-eos-amy-bitbuster-vram.mjs
node tools/test-native-eos-amy-nibble-vram.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-controller-smoke.alexis --target adam-native-program --rom build/adam-native-eos-controller-smoke.bin --opt safe
node tools/test-native-eos-amy-controller.mjs
node tools/test-eos-controller-poller.mjs
node tools/test-native-eos-amy-sprites.mjs
node tools/test-native-eos-amy-spinner.mjs
node tools/test-gearcoleco-spinner-convergence.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-sound-smoke.alexis --target adam-native-program --asm build/adam-native-eos-sound-smoke.asm --rom build/adam-native-eos-sound-smoke.bin
node tools/test-native-eos-amy-sound.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-psg-smoke.alexis --target adam-native-program --asm build/adam-native-eos-psg-smoke.asm --rom build/adam-native-eos-psg-smoke.bin
node tools/test-native-eos-amy-psg.mjs
node tools/amyc.mjs studio/examples-src/adam-native-eos-ay-smoke.alexis --target adam-native-program --hardware adam-sound-enhancer --asm build/adam-native-eos-ay-smoke.asm --rom build/adam-native-eos-ay-smoke.bin
node tools/test-native-eos-amy-ay.mjs
node tools/test-adam-project-forms.mjs
node tools/test-eos-vram-transfer.mjs
node tools/test-where-on-earth-adam-disk.mjs <DSK>
node tools/test-where-on-earth-adam-disk.mjs <DDP>
```

The detailed per-syntax table will be generated from the compiler and
autocomplete inventories as native EOS handlers are added. A newly recognized
Amy command must enter this matrix before it can be described as supported.
