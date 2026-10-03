# EOS and OS-7 routine comparison

Date: 2026-09-29

## Conclusion

An ADAM program can be genuinely EOS-native. EOS contains its own callable video, controller, sound, console, AdamNet, file, and memory-management services. It does not need to retain OS-7 merely to draw graphics, scan controllers, or play conventional sound.

Coleco's technical reference explicitly calls the low-level group **EOS routines adapted from OS_7**. It also warns that EOS inputs and outputs are not necessarily identical to the OS-7 equivalents. Amy Studio must consequently expose a common high-level Amy operation through target-specific backends, not substitute EOS addresses for OS-7 addresses in generated assembly.

Primary references:

- [Coleco ADAM Technical Reference Manual](https://www.colecovisionadam.com/Coleco/adam/Documents/Manual/Coleco_ADAM_Technical_Reference_Manual.pdf), sections 4.1.5-4.1.7.
- [EOS Programmer's Manual](https://www.adamcon.org/eosprogman.html), including calling conventions and the EOS jump table.
- [Coleco ADAM EOS 6 Preservation Build](https://github.com/reed-rosa/coleco-adam-eos), an assembleable reconstruction of the first 8K EOS 6 bank with a complete 101-vector symbol manifest and byte-for-byte verification.
- Local production firmware: `EOS.ROM` and `OS7.ROM`, both 8 KiB, verified by `tools/analyze-eos-os7-services.mjs`.

The local `EOS.ROM` is byte-identical to the preservation build's reconstructed
EOS 6 bank: 8192 bytes, MD5 `01df3140909f09aa9aac4f88890f676c`.
`tools/test-eos6-preservation-reference.mjs` independently checks this identity,
the complete jump-table shape, Amy's consumed vector addresses, and EOS-owned RAM.

Generated annotated listings:

- [`reference/eos-adapted-services-disassembly.asm`](reference/eos-adapted-services-disassembly.asm)
- [`reference/eos-full-jump-table-disassembly.asm`](reference/eos-full-jump-table-disassembly.asm)
- [`reference/os7-related-services-disassembly.asm`](reference/os7-related-services-disassembly.asm)

`tools/generate-eos-os7-disassembly.mjs` regenerates both listings from the
local firmware. It follows reachable control flow from documented entry points
instead of decoding data gaps as fictitious instructions.

The focused EOS listing covers the routines inherited from OS-7. The full EOS
listing starts from every three-byte public vector from `$FC30` through `$FD5C`
and currently contains about 3,800 annotated lines. Until each executive/file
service name is independently verified, unknown entries deliberately retain
neutral labels rather than speculative names. The `$FC60-$FC7B` names below
are now corroborated by D. Sage's historical system-call table and the local
EOS implementation.

## Confirmed EOS executive and AdamNet vectors

| EOS entry | Service | Register contract confirmed in EOS |
| ---: | --- | --- |
| `$FC60` | reset AdamNet | Pulses AdamNet reset through port `$3F`. |
| `$FC63` | print ETX string | `HL` points to bytes terminated by ETX (`$03`); EOS sends chunks of at most 16 bytes and retries busy status `$86`. |
| `$FC66` | print character | `A` contains the character; completion/error returns in `A`. |
| `$FC69` | read block device | `A` selects the device, `HL` is the destination, and `BCDE` is the 32-bit block number. |
| `$FC6C` | read keyboard character | Character or error result returns in `A`. |
| `$FC6F` | keyboard completion | Reads the keyboard DCB completion code (device `$01`) into `A`. |
| `$FC72` | printer completion | Reads the printer DCB completion code (device `$02`) into `A`. |
| `$FC75` | device completion | `A` selects a device; its DCB completion code returns in `A`. |
| `$FC78` | tape completion | Reads the tape DCB completion code (device `$08`) into `A`. |
| `$FC7B` | relocate PCB | `HL` supplies the new Peripheral Control Block address; EOS waits for relocation completion and updates its PCB pointer. |

This historical evidence also improves generated code: Amy string literals
sent to the printer now use one `$FC63` call and inline ETX-terminated data,
instead of emitting one `$FC66` call per character. Scalar-byte printing still
uses `$FC66`. The native DSK/DDP printer test verifies the resulting spool and
status behavior in GearColeco.

## Stable EOS adapted-service table

The local EOS binary maps at `$E000-$FFFF`. Every documented adapted-service entry below is a three-byte `JP` in the production jump table.

| EOS entry | EOS service | Implementation | Closest OS-7 service |
| ---: | --- | ---: | --- |
| `$FD11` | `SET_VDP_PORTS` | `$E191` | ADAM-specific setup |
| `$FD14` | `SWITCH_MEM` | `$E185` | ADAM-specific banking |
| `$FD17` | `PUT_ASCII` | `$E153` | no direct public equivalent |
| `$FD1A` | `WRITE_VRAM` | `$E000` | `$1FDF` |
| `$FD1D` | `READ_VRAM` | `$E01A` | `$1FE2` |
| `$FD20` | `WRITE_REGISTER` | `$E034` | `$1FD9` |
| `$FD23` | `READ_REGISTER` | `$E04F` | `$1FDC` |
| `$FD26` | `FILL_VRAM` | `$E059` | `$1F82` |
| `$FD29` | `INIT_TABLE` | `$E066` | `$1FB8` |
| `$FD2C` | `PUT_VRAM` | `$E0C9` | `$1FBE` |
| `$FD2F` | `GET_VRAM` | `$E0CF` | `$1FBB` |
| `$FD32` | `CALC_OFFSET` | `$E10A` | `$08C0` |
| `$FD35` | `PX_TO_PTRN_POS` | `$E129` | `$07E8` |
| `$FD38` | `LOAD_ASCII` | `$E149` | `$1F7F` |
| `$FD3B` | `WR_SPR_ATTRIBUTE` | `$E1C5` | `$1FC4` |
| `$FD3E` | controller poller | `$E253` | `$1FEB`, but different table contract |
| `$FD41` | spinner update | `$E2A4` | `$1F88` |
| `$FD44` | `DECLSN` | `$E355` | internal OS-7 sound utility |
| `$FD47` | `DECMSN` | `$E35F` | internal OS-7 sound utility |
| `$FD4A` | `MSNTOLSN` | `$E369` | internal OS-7 sound utility |
| `$FD4D` | `ADD8TO16` | `$E374` | internal OS-7 sound utility |
| `$FD50` | `SOUND_INIT` | `$E3AB` | `$1FEE`-style setup |
| `$FD53` | `TURN_OFF_SOUND` | `$E3D1` | `$1FD6` |
| `$FD56` | `PLAY_IT` | `$E3E7` | `$1FF1`-style start |
| `$FD59` | `SOUNDS` | `$E406` | `$1F61` |
| `$FD5C` | `EFFECT_OVER` | `$E4B8` | `$1FF4`-style progression |

The names in old manuals vary slightly (`POLLER` versus `READ GAME CONTROLLER`, for example). Addresses and binary targets are the reliable identifiers.

## Mapping by implementation lineage

| Function family | OS-7 | EOS | Relationship seen in disassembly | ABI status |
| --- | ---: | ---: | --- | --- |
| raw VRAM write | `$1FDF->$1D01` | `$FD1A->$E000` | same `OUTI` page-copy idea; EOS rewrites page counting and uses configured ports | same main registers, different clobbers; EOS needs no count patch |
| raw VRAM read | `$1FE2->$1D3E` | `$FD1D->$E01A` | same `INI` page-copy idea; EOS rewrites page counting and setup | same main registers, different clobbers; EOS needs no count patch |
| VDP register write/read | `$1FD9/$1FDC` | `$FD20/$FD23` | same operations; EOS obtains the control port from `$FC29` and maintains `$FD61-$FD63` | close, but target-specific state |
| fill VRAM | `$1F82->$18D4` | `$FD26->$E059` | same decrementing `DE` loop; EOS uses its configured data port | close input contract |
| initialize VDP tables | `$1FB8->$1B1D` | `$FD29->$E066` | strongly homologous instruction sequence with EOS state relocated to `$FD64-$FD6D` | close registers, incompatible state addresses |
| table PUT/GET | `$1FBE/$1FBB` | `$FD2C/$FD2F` | same table-number and scaled-entry concept; OS-7 has cartridge/sprite-shadow special cases | similar public concept, wrapper required |
| coordinate calculations | `$08C0/$07E8` | `$FD32/$FD35` | same 32-column and 8-byte-pattern arithmetic family | verify signed-edge behavior before aliasing |
| load ASCII | `$1F7F->$1927` | `$FD38->$E149` | both load a BIOS character set; EOS can select ranges through `PUT_ASCII` and temporarily switches memory | different implementation and state |
| sprite priority writer | `$1FC4->$1C82` | `$FD3B->$E1C5` | same indexed-priority-table concept and four-byte `OUTI` per sprite | related contract, different table ownership |
| controller poller | `$1FEB->$11C1` | `$FD3E->$E253` | same scan/decode/debounce ancestry; layouts and selection masks differ | incompatible ABI |
| spinner update | `$1F88->$116A` | `$FD41->$E2A4` | same hardware role with EOS-owned accumulators and configurable ports | incompatible state |
| sound initialization | `$1FEE->$0213` | `$FD50->$E3AB` | near line-for-line structure; EOS relocates pointers from `$7020...` to `$FE6E...` | strongly related format, different state |
| silence PSG | `$1FD6->$023B` | `$FD53->$E3D1` | same `$9F,$BF,$DF,$FF` writes; EOS reads the PSG port from `$FC2F` | behavior equivalent |
| sound start/manager | `$1FF1/$1F61/$1FF4` | `$FD56/$FD59/$FD5C` | visibly shared engine structure with relocated work areas and dynamic PSG port | likely data-format compatible; runtime test still required |

This mapping distinguishes **shared ancestry** from **drop-in compatibility**.
Only the high-level behavior should be shared by Amy source code. Even routines
whose instruction structure is nearly identical must use target-specific
symbols because their RAM state is relocated.

## Firmware RAM and state mapping

The following addresses are firmware-owned state observed in the production
ROM disassemblies. They are not general-purpose RAM and are not safe targets
for mechanical address substitution.

| Purpose | OS-7 state | EOS state | Portability rule |
| --- | ---: | ---: | --- |
| Sound table/state root | `$7020-$702A` | `$FE6E-$FE78` | Same engine lineage, different ownership and layout; use a sound backend. |
| VDP register 0 shadow | OS-7 internal state | `$FD61` | Do not expose as application RAM. |
| VDP register 1 shadow | `$73C4` | `$FD62` | Firmware-specific. EOS `WRITE_REGISTER` updates `$FD62`, not `$73C4`. |
| VDP status shadow | OS-7 internal state | `$FD63` | Read through the target backend. |
| VDP table pointers | `$73F2-$73FB` | `$FD64-$FD6D` | Initialized by the target's `INIT_TABLE`; layouts are related but not interchangeable. |
| Controller/debounce work | `$73D7-$73F1` | `$FE58-$FE6D` | Private poller state with incompatible result contracts. |
| VDP control port | ColecoVision hardware is `$BF`; OS-7 also carries the port in BIOS state, while typical game/homebrew routines use `$BE/$BF` directly | byte at `$FC29` | EOS services obtain the configured port dynamically. Amy's OS-7 direct helpers deliberately use the hardware constants to avoid caller setup of `C`; this does not mean OS-7 itself lacks a stored port value. |
| Controller ports | fixed hardware convention | words at `$FC2B/$FC2D` | EOS owns selection and configured-port state. |
| PSG port | fixed ColecoVision hardware convention | byte at `$FC2F` | EOS sound services obtain the configured port dynamically. |

Amy native-EOS screen control now treats EOS `$FD62` as authoritative R1
state. The earlier private Amy copy at `$23C4` has been removed because two
shadows could diverge whenever EOS code changed the register. OS-7 continues
to use `$73C4`; target-specific lowering selects the proper address rather than
presenting the two as application-RAM equivalents.

The same rule now applies to VDP table pointers. Native Amy code uses EOS
`$FD66/$FD68/$FD6A/$FD6C` for sprite-pattern, name, pattern, and color table
pointers rather than mirroring OS-7 `$73F4/$73F6/$73F8/$73FA` into private
`$23xx` storage. The native DSK/DDP smoke test verifies `$FD68=$1800` after
`text screen` and then uses that EOS-owned pointer for text placement.

Direct EOS `WRITE_REGISTER` calls do not derive the pattern and color pointer
words from R4 and R3. Native Amy mode setup therefore initializes
`$FD6A=$0000` and `$FD6C=$2000` before helpers can consume those pointers.
This initialization is emitted only when the program uses a graphics-mode
routine. A DSK/DDP `tile screen` test verifies R0-R6, the EOS pointers, NAME
output, the 2 KiB R3=`$9F` color region, and byte-for-byte duplication of the
first 2 KiB pattern third into the other two Graphics II thirds.

The Amy-owned ZX0-to-VRAM decoder is also independent of either firmware ABI.
A 717-byte native program boots from both DSK and DDP, enters the full Graphics
II picture mode, and expands a 391-byte project asset into 6 KiB of color VRAM
that is byte-identical to the JavaScript reference decoder. A complete Warrior
pattern-plus-color payload reaches 3,184 bytes and therefore cannot be placed
in a one-block BOOT record. Amy Studio now emits a minimal first stage, copies
its loader below `$8000`, and loads four program blocks into `$C800-$DFFF`
before jumping to the Amy entry point. DSK uses ADAMnet device `$04`; DDP uses
device `$08`. Both forms reproduce all 12 KiB of decompressed picture VRAM.
ZX1 now has equivalent native evidence rather than inheriting ZX0's result: a
1,608-byte pair of independently compressed synthetic streams expands to
6 KiB of pattern data and 6 KiB of color data. GearColeco verifies every byte
after booting both the multiblock DSK and DDP forms.
Pletter is independently verified as well because its timing-sensitive
copyback loop alternates VDP reads and writes. Its 1,561-byte combined payload
also reproduces the complete 12 KiB source on both native media forms.
ZX2's direct VDP decoder is independently exercised from DSK and DDP too. Its
5,279-byte synthetic payload reproduces the same complete 12 KiB source, while
the OS-7 form remains verified in all five optimizer profiles.
aPLib's distinct direct-VDP decoder, including its IX/IY preservation and
copyback path, is likewise runtime-tested. A 1,681-byte combined stream
reproduces the complete 12 KiB source from both native media types.
MegaLZ also passes through its DEC40-derived direct-VDP copy loop with a
1,815-byte combined stream. Exomizer 2 needs additional target work RAM: native
EOS now conditionally reserves its aligned 156-byte table at `$2100-$219B`
and begins user allocation at `$219C`. Its 1,416-byte stream reproduces the
complete 12 KiB source from DSK and DDP. Native programs without Exomizer keep
their original `$2100` user-RAM start.
ZX7 and all three DAN formats now have separate native evidence too. ZX7's
timing-padded copyback loop expands 1,557 bytes to 12 KiB. DAN1 and DAN2 expand
1,731 and 1,715 bytes respectively; DAN3 uses the published 2,891-byte Warrior
streams so routine regression does not repeatedly pay the optimal compressor's
long search time. Every form is byte-exact on DSK and DDP.
The remaining integrated formats now have the same native evidence: MDK-RLE
and its separately executed `rle` syntax alias (3,687 bytes), LZF (1,700),
BitBuster 1.2 (3,611), and Nibble (3,345). This completes codec-name coverage,
not every source/destination syntax variant; indexed streams, offsets, absolute
VRAM addresses, and NAME/sprite destinations remain a separate test matrix.
The current fixed window supports six blocks; larger games require overlays or
a deliberate bank/memory-map design rather than overwriting EOS at `$E000`.

The canonical machine-readable inventory is
`studio/core/firmwareMaps.js`. `tools/test-firmware-maps.mjs` validates every
listed EOS public entry against the local `EOS.ROM`, validates all declared
OS-7/EOS service relations, and checks that the native Amy allocation window
does not overlap EOS firmware state.

The current conservative native allocator uses `$2100-$2EFF` and reserves
`$2F00-$2FFF` for the stack (`SP=$2FF0`). This prevents a large Amy variable
set from silently colliding with call frames. Additional ADAM RAM above the
stack is not exposed until the allocator supports discontiguous regions.

## Calling-convention differences

### Raw VRAM transfers

EOS `WRITE_VRAM $FD1A` and `READ_VRAM $FD1D` use:

- `BC`: byte count
- `DE`: VRAM address
- `HL`: RAM source or destination
- returned `HL`: one byte beyond the transferred buffer

They are close conceptual matches for OS-7 `$1FDF/$1FE2`, but generated Amy code must still use a backend-specific ABI wrapper and clobber set.

The implementations differ in an important way. OS-7's raw transfer loop uses
`C` through `OUTI/INI`, then decrements `B` as a page counter. Exact multiples
of 256 such as `$0100` and `$0200` work, but a mixed count such as `$0101`
requires the traditional caller correction `INC B`. Amy's cartridge backend
applies that correction whenever `C != 0`.

EOS performs the page conversion internally. Its `$E000/$E01A` implementations
separate the low-byte portion from the complete 256-byte pages and do not need
the OS-7 caller patch.

`tools/test-eos-vram-transfer.mjs` booted a native EOS DSK in GearColeco and
verified every transferred byte for writes of 255, 256, 257, 512, 513, and 768
bytes. It also verified a 513-byte EOS read. This proves both exact-page and
cross-page cases against the production `EOS.ROM`, rather than only inferring
behavior from disassembly.

### Table-oriented VRAM transfers

EOS `PUT_VRAM $FD2C` and `GET_VRAM $FD2F` use `A` for table number, `DE` for first entry, `HL` for the user buffer, and `IY` for entry count. EOS consults its table pointers at `$FD64-$FD6D` and scales entries according to the selected table.

This is functionally related to OS-7 `PUT_VRAM/GET_VRAM`, but the EOS state addresses and register contract belong to EOS. A native target must initialize EOS table pointers with `$FD29` rather than depend on OS-7 state.

The same GearColeco test initializes EOS table 2 at VRAM `$2000` and verifies a
512-entry `PUT_VRAM $FD2C` transfer. It succeeds without any OS-7 count patch.

### ASCII and sprite services

EOS `$FD38` loads its default 128-character set into the configured pattern table. `$FD17` can copy a selected character range. `$FD3B` writes sprites in an explicit priority order, accepting the sprite count, attribute table, and priority table.

Amy's native EOS sprite backend now preserves the same logical shadow-table contract as the OS7 target. `update sprites` normalizes each color with `$8F`, supplies an identity priority table to `$FD3B`, writes through EOS table 0 at `$FD64`, and appends the TMS9918A `$D0` terminator. `tools/test-native-eos-amy-sprites.mjs` executes this path from both DSK and DDP media and verifies the resulting SAT bytes in VRAM.

EOS spinner support uses the firmware-owned signed accumulators at `$FE58/$FE59`. Native Amy's `spinner(n)` bridge keeps maskable interrupts disabled, selects joystick segment `$C0`, calls `$FD41` cooperatively, restores keypad segment `$80`, atomically reads and clears the requested accumulator, and preserves Amy's historical reversal of spinner 1. This is deliberately different from the OS7 interrupt-driven backend: enabling maskable interrupts in a native EOS application can enter the incompatible OS7 `$0038` handler. DSK and DDP execution now verifies both spinners in both signed directions, so the native EOS bridge is `VERIFIED`.

### OS7 hypothesis discovered from the EOS spinner bridge

The EOS experiment demonstrates that spinner state can be sampled synchronously when the code explicitly selects the joystick controller segment before invoking the firmware decoder. An optional OS7 backend could therefore call `$1F88` at `spinner(n)` reads instead of reserving a cartridge RST `$38` handler. This may simplify interrupt ownership for programs that sample infrequently, but it is not automatically better: repeated reads add code and polling latency, while the existing interrupt accumulator captures motion between frames. Before adoption, compare ROM size, missed-motion behavior, NMI interaction, and two-controller signs against the current OS7 backend. The validated OS7 implementation remains unchanged.

The experiment also exposed and fixed a GearColeco input-model edge case relevant to both targets. `Input::ReadInput` consumed `spinnerRelative / 4`; C++ integer truncation left magnitudes `1..3` unchanged forever. The core now consumes a final nonzero residue as `+1` or `-1`, so polling converges to zero. Cartridge and native EOS tests verify both controllers and both signed directions.

These services are sufficient for a native text or game display and can support Amy's existing character loading and sprite-priority abstractions without OS-7.

### Controllers

EOS `$FD3E` accepts a controller-selection mask in `A` and a user table through `IX`. It can read either or both controllers, optionally accumulate spinners, and maintains a two-sample debounce. Its result table contains ten bytes: direction, two fire buttons, keypad, and spinner for each player.

OS-7 instead exposes three useful layers:

- `CONT_SCAN $1F76`: raw scan into OS-7 shadow bytes.
- `DECODER $1F79`: immediate decode of one controller segment.
- `POLLER $1FEB`: selective decoding and debounce through the cartridge controller table.

EOS `$FD3E` is therefore related most closely to OS-7 `POLLER`, but it is not ABI-compatible. Amy's high-level `joypad` operations need an EOS-specific state adapter.

That adapter is now implemented and runtime-tested. EOS returns five bytes per
player: direction (`$01/$02/$04/$08`), left fire (`$40`), right fire (`$40`),
keypad (`0..11`, idle `$0F`), and spinner. EOS/GearColeco player order is
opposite Amy's order, so the adapter swaps the two five-byte halves, maps left
and right fire to Amy bits 7 and 6, and converts keypad idle to `$FF`.
`tools/test-eos-controller-poller.mjs` validates the raw contract;
`tools/test-native-eos-amy-controller.mjs` validates both Amy players through
the complete DSK, EOS, emulator-input, and language-expression path.

The first backend polls synchronously before a generated joypad/keypad read.
This is deterministic without requiring an EOS NMI handler. A later optimizer
may coalesce repeated reads into one poll per expression block or frame, but it
must retain the same observable state and debounce behavior.

### Sound

EOS supplies sound-table initialization at `$FD50`, silence at `$FD53`, start at `$FD56`, frame progression at `$FD59`, and completion handling at `$FD5C`. The service family accepts the same effect-data format as OS-7, but EOS owns its table pointer at `$FE6E`, channel pointers at `$FE70-$FE77`, and noise cache at `$FE78`.

Amy's native EOS backend redirects the BIOS-format sound vectors and relocates as many as 32 ten-byte work areas from the OS-7 convention beginning at `$702B` to native application RAM beginning at `$3000`. The cooperative frame owner advances `$FD59` after each EOS VBlank consumed by Amy `wait`. DSK/DDP tests cover initialization, playback, and completion without enabling NMI. A synchronized two-channel TinySound comparison proves 48/48 scheduler frames and 48/48 semantic BIOS sound-state frames equal to OS7. A separate ordinary BIOS-effect comparison proves 24/24 semantic frames for two simultaneous voices. Both targets produce nonzero audio in both test families.

VoxPCM is independent of those firmware sound tables: its cycle-balanced decoder writes directly to the stock PSG at `$FF`. Native EOS therefore keeps the decoder but removes the OS7-specific NMI and VDP-shadow wrapper around `play voxpcm`. A 664-byte DSK/DDP test plays both direct and dynamically indexed sequences, returns to Amy code in the `$C800-$DFFF` application bank, and produces nonzero PCM while maskable interrupts remain disabled.

The attempted asynchronous NMI integration exposed an important loader mapping constraint, not a prohibition imposed by EOS. EOS 6 publishes a default NMI vector containing `RETN`; a native program running with writable low RAM can replace `$0066`, then enable VDP R1 bit 5 and own VBlank. Amy's current loader/MIOC execution does not yet preserve that stable application-owned `$0066`, and forcing another MIOC layout can hide the program bank containing `$C800`. Native startup therefore clears VDP R1 bit 5 while preserving the display bit, because `DI` cannot mask a TMS9918A NMI. Amy neither replaces `$0066` nor silently claims firmware NMI ownership. Instead, frame waits call EOS `$FD23`; the accepted cooperative owner advances timers, VBlank hooks, TinySound, and BIOS-format sound exactly once for every VBlank consumed by Amy `wait`. Blocking menus and controller waits combine that service with EOS `$FD3E`. Truly asynchronous callbacks while user code runs without `wait`, CRT-safe pauses, and native `nmi on` remain unsupported until the loader explicitly reserves low RAM, installs/restores the vector, and proves the mapping on DSK and DDP.

A discarded experiment polled the TMS9918A status port directly. GearColeco
resumed inside EOS near `$E7B4`, and physical R1 returned to `$00`. The accepted
backend does not touch the port directly: it calls the stable EOS `$FD23`
service, which preserves firmware ownership while exposing the VBlank status.

### Optional EOS from an OS-7 cartridge

An OS-7 cartridge that merely gains save or high-score support when run on an
ADAM is a fourth runtime form, not the existing media hybrid. It must boot and
remain complete on a stock ColecoVision. On ADAM it may detect resident EOS,
run a low-RAM trampoline, map upper main RAM in place of the cartridge, call
the EOS copy at `$FCxx`, restore the cartridge mapping, and return to OS-7.

GearColeco confirms why a direct call after exposing the EOS ROM is unsafe.
MIOC lower mode 0 exposes the 8 KiB EOS firmware at logical `$6000-$7FFF`, but
its jump table and internal references are linked for the runtime copy at
`$E000-$FFFF`. The optional path therefore requires a proven test for that
high-RAM copy plus exact preservation of MIOC, stack, interrupt state, and the
cartridge continuation address. Amy does not yet emit this bridge. ADAM MIOC,
MegaCart bank reads, and modern SGM/SGM2 ports remain separate protocols.

The EOS argument generators themselves no longer require literals. The ABI
regression compiles calculated block numbers and transfer lengths, byte
expressions for printer/keyboard services, and `Buffer[Offset]` where `Offset`
is `u16`. This permits 1 KiB EOS buffers without truncating their dynamic index.

## Services EOS adds beyond OS-7

The adapted routines are only the final part of the EOS jump table. EOS also exposes services absent from normal cartridge OS-7 programming:

- console character output and window handling;
- keyboard input is now covered by runtime-verified blocking and asynchronous request/poll/reset commands;
- AdamNet device discovery and generic DCB operations remain deliberately
  unexposed until their device-specific layouts and asynchronous lifetimes are
  runtime-verified; typed block, keyboard, and printer wrappers cover the
  stable services already understood. EOS-capable Amy targets now provide the
  reserved `AdamNetPcb` (4-byte) and `AdamNetDcb` (21-byte) record types so
  device APIs can share one verified binary layout without exposing a verbose
  or premature command syntax. Their layout is compile-verified, while generic
  request submission remains pending runtime evidence;
- raw block reads and writes are exposed and runtime-verified on DSK and DDP;
- EOS named-file allocation growth (reads, creation, in-place writes, and deletion are now runtime-verified in Amy);
- memory-bank switching and OS-7 access;
- boot and return-to-SmartWriter services.

EOS `$FD3E` controller polling is safe both for sampled main-loop reads and the
action-button waits now emitted by Amy. The first long-running `wait fire`
experiment reached restart vector `$0042`, but the controller service was not the
cause: the loader had left VDP interrupts enabled while the native application did
not own `$0066`. Native startup now disables that NMI source through EOS
`WRITE_REGISTER`. A second edge case was found at the same time: one byte of user
RAM produced `LDIR` with `BC=0`, which means 65,536 transfers on Z80. Startup now
skips `LDIR` when no bytes remain. DSK/DDP tests verify 120 idle frames followed by
release/press waits on player 1 and timed early exit on player 2.

These are what make a pure EOS application materially different from a ColecoVision game placed on disk.

### Audit of the 40 newly named EOS vectors

The October 2026 complete-vector audit compared these entries with the whole
8 KiB OS-7 image, not only with its documented public jump table. It found no
additional OS-7 service that Amy can safely treat as an EOS equivalent.

| EOS vector group | Entries | OS-7 conclusion |
| --- | --- | --- |
| EOS kernel lifecycle | `DELAY_AFTER_HARD_RESET`, `HARD_INIT`, `SOFT_INIT`, `SYNC_CLOCKS` | EOS/ADAM initialization and timing machinery; no OS-7 ABI counterpart |
| ADAMnet bookkeeping | `FIND_DCB`, `GET_DCB_ADDRESS`, `GET_PCB_ADDRESS`, `REQUEST_STATUS`, `REQUEST_KEYBOARD_STATUS`, `REQUEST_PRINTER_STATUS`, `REQUEST_TAPE_STATUS`, `SCAN_ACTIVE_DEVICES` | DCB/PCB and active-device operations depend on ADAMnet structures absent from OS-7 |
| ADAMnet request lifecycle | `END_PRINT_BUFFER`, `END_PRINT_CHAR`, `END_READ_BLOCK`, `END_READ_CHAR_DEVICE`, `END_WRITE_BLOCK`, `END_WRITE_CHAR_DEVICE`, `SOFT_RESET_DEVICE`, `SOFT_RESET_PRINTER`, `SOFT_RESET_TAPE`, `START_PRINT_BUFFER`, `START_PRINT_CHAR`, `START_READ_BLOCK`, `START_READ_CHAR_DEVICE`, `START_WRITE_BLOCK`, `START_WRITE_CHAR_DEVICE`, `WRITE_BLOCK_DEVICE`, `WRITE_CHAR_DEVICE` | Device request wrappers and completion handlers; no ColecoVision hardware or OS-7 service can implement their contract |
| EOS file/date internals | `GET_DATE`, `READ_DEVICE_DEPENDENT_STATUS`, `READ_EOS`, `MODE_CHECK`, `SCAN_FOR_FILE`, `FILE_QUERY` | EOS media, directory, permission, and clock services; no OS-7 filesystem exists |
| Disabled compatibility slots | `POSITION_FILE`, `EOS_1`, `EOS_2`, `EOS_3`, `CV_A` | All five jump to the same EOS 6 default/error stub at `$F442`; they are not usable services to map |

A binary-prefix scan did find short common sequences. Most stop after five
bytes of register-save prologue. `START_PRINT_BUFFER` shares eight initial
bytes with an internal OS-7 routine, but the next instruction calls a different
subsystem: EOS enters ADAMnet while OS-7 continues through unrelated console
firmware. This is evidence of common Coleco coding ancestry, not compatible
semantics. `SCAN_FOR_FILE` similarly shares only a generic register-save
prefix. These matches must therefore remain outside
`OS7_EOS_SERVICE_RELATIONS`.

The practical boundary is now explicit: the 19 relations in the canonical map
are the verified OS-7/EOS graphics, controller, and sound lineage. Console
services may be analogous at a higher level, but the newly named vectors are
EOS-only. Amy should lower an operation to independent OS-7 and EOS backends
rather than call any of these EOS vectors from a stock cartridge target.

EOS `$FCCC` returns a 23-byte directory record, not a flat byte length. Amy's
`Size = size "SAVE" status Result` therefore derives a `u32` value from
the record's used-block count and final-block byte count. GearColeco verifies
an exact 70,000-byte result, an empty file, and the missing-file path on both
DSK and DDP.

EOS `$FCC9` likewise receives its allocation size in `BCDE`. `create "SAVE" Bytes`
keeps the compact 16-bit expression path but now also accepts a `u32` variable
and forwards all four bytes. A 70,000-byte create/exist/delete lifecycle is
runtime-verified on writable DSK and DDP images.

Amy records and RAM overlays are independent of OS-7 and now have native EOS
runtime evidence rather than compile-only coverage. A 357-byte program boots
from both DSK and DDP, mutates a record-array element through a `ref` parameter,
proves two typed overlay views share the same physical byte, and iterates a
qualified overlay record array. Its allocation is 32 physical bytes overall;
the overlay itself stores 18 logical bytes in 16 physical bytes.

Native VRAM buffer transfers also require a real backend distinction. OS-7's
`WRITE_VRAM` and `READ_VRAM` wrappers need a historical high-byte count
correction when the low count byte is nonzero; EOS `$FD1A/$FD1D` accept the
exact `BC` count and must not receive that correction. Amy now specializes its
wide read/write wrappers for EOS and routes scalar `vpoke`/`vpeek` through EOS
with `AMY_BUFFER32`, avoiding OS-7 scratch address `$701F`. A 348-byte Amy
program verifies a 513-byte round trip and the 255/256 boundary on DSK and DDP.
The OS-7 implementation remains separate and is runtime-tested in all five
optimizer profiles. The modern `colecovision-cartridge` target now enters the
same OS-7 header-generation path as the historical
`colecovision_legacy_sdcc` profile, preventing new CLI or Studio projects from
emitting an unbootable headerless body.

## Amy Studio architecture

Amy should distinguish three targets:

| Target | Runtime services | Intended product |
| --- | --- | --- |
| `colecovision-cartridge` | OS-7 or standalone runtime | ROM/MegaCart |
| `adam-os7-eos` | OS-7 gameplay plus selected EOS storage/device calls | cartridge-like game expanded by ADAM media |
| `adam-eos-native` | EOS jump table and EOS memory model | native DSK/DDP application |

The DSK/DDP container is not itself an ABI. Amy Studio derives callable
services from each output's memory profile: `adam-eos-application` and
`adam-eos-boot-block` expose EOS, `colecovision_legacy_sdcc` exposes OS-7, and
`adam-os7-eos-drivers` exposes both. This prevents an OS-7 compatibility disk
from accidentally compiling EOS calls while allowing a cartridge-like hybrid
to call EOS storage, keyboard, and printer services. Hybrid and native block
I/O use ADAMnet device `$04` on DSK and `$08` on DDP.

The Amy source operation can remain uniform while lowering differs:

| Amy operation | Cartridge backend | Native EOS backend |
| --- | --- | --- |
| VRAM copy | OS-7 `$1FDF` or Amy direct VDP | EOS `$FD1A` |
| VRAM fill | OS-7 `$1F82` or Amy direct VDP | EOS `$FD26` |
| initialize tables | OS-7 `$1FB8` | EOS `$FD29` |
| load ASCII | OS-7 `$1F7F` | EOS `$FD38` |
| display bit / backdrop | OS-7 register shadows | EOS R1 shadow `$FD62`; Amy-owned R7 shadow `$20E0` |
| Graphics II tile setup | OS-7 table calls plus Amy VDP helpers | EOS `$FD20/$FD29/$FD38` plus Amy pattern-third duplication |
| Graphics II bitmap setup | OS-7 table calls plus Amy VDP helpers | EOS `$FD20/$FD26/$FD29` plus Amy sequential NAME generation |
| ZX0 to VRAM | Amy direct VDP decoder | Same Amy direct VDP decoder, DSK/DDP runtime verified |
| ZX1 to VRAM | Amy direct VDP decoder | Same Amy direct VDP decoder, DSK/DDP 12 KiB runtime verified |
| Pletter to VRAM | Amy direct VDP decoder | Same timing-sensitive Amy direct VDP decoder, DSK/DDP 12 KiB runtime verified |
| ZX2 to VRAM | Amy direct VDP decoder | Same Amy direct VDP decoder, DSK/DDP 12 KiB runtime verified |
| aPLib to VRAM | Amy direct VDP decoder | Same IX/IY-preserving direct VDP decoder, DSK/DDP 12 KiB runtime verified |
| MegaLZ to VRAM | Amy direct VDP decoder | Same DEC40-derived direct VDP decoder, DSK/DDP 12 KiB runtime verified |
| Exomizer 2 to VRAM | Amy direct VDP decoder plus aligned work table | Same decoder with target-owned `$2100-$219B` table, DSK/DDP 12 KiB runtime verified |
| ZX7 to VRAM | Amy timing-padded direct VDP decoder | Same decoder, DSK/DDP 12 KiB runtime verified |
| DAN1/DAN2/DAN3 to VRAM | Amy direct VDP decoders | All three variants independently DSK/DDP runtime verified |
| MDK-RLE / `rle` alias to VRAM | Amy direct VDP decoder | Decoder and both Amy spellings DSK/DDP runtime verified |
| LZF / BitBuster / Nibble to VRAM | Amy direct VDP decoders | Each decoder independently DSK/DDP 12 KiB runtime verified |
| controllers | OS-7 selected backend | EOS `$FD3E` adapter |
| BIOS-format sound | OS-7 sound entries | EOS `$FD50-$FD5C` adapter |
| files/blocks/keyboard | unavailable or custom | EOS services in native and OS7+EOS hybrid profiles |

## Required validation before implementation

1. Combine the existing EOS-native VDP, controller, sprite, spinner, and sound smoke programs under a native VBlank owner without mapping OS-7.
2. Record register clobbers and RAM state for each wrapper in GearColeco.
3. Verify EOS revision differences instead of hard-coding internal `$E000` implementation addresses. Generated programs must call only stable `$FC30-$FD5C` jump-table entries.
4. Reserve `$FC17-$FDFF` and any documented EOS work areas in the native memory profile.
5. Keep OS-7 and EOS symbols in separate namespaces so inline assembly cannot silently call the wrong ABI.

This test should precede conversion of ADAM Bomb 2-like projects. Once it succeeds, Amy Studio can legitimately claim native EOS program generation rather than only ADAM-compatible packaging.
