# ADAM modem and serial interface map

Status: deterministic emulator backend implemented; real-software validation in progress; Amy API not implemented  
Last verified: 2026-10-02

## Reference program

The executable `Tank` from `ANN Disk - 1999-02b - E.O.S. Files.dsk` is the
ModemTank v1.0 program by Bonafide Systems. Its accompanying `ModemTankA`
article documents four smart-key choices:

1. Coleco AdamLink modem;
2. Orphanware/Eve serial port 1;
3. MicroInnovations serial port 1;
4. no modem, for local play.

The program stores those choices internally as selectors `0`, `1`, `2`, and
`3`. Static analysis proves three distinct direct-I/O implementations, but the
first two labels previously inferred from menu order conflicted with the
hardware manuals. The table below uses the documented hardware mapping.

## Confirmed port families

| Selector | Interface | Data | Status/control | Observed status masks | Other initialization ports |
| --- | --- | --- | --- | --- | --- |
| `0` | Coleco AdamLink | `$5E` | `$5F` | SCN2651: TxRDY `$01`, RxRDY `$02`, DCD `$40` active-low, DSR `$80` asserted | same pair |
| `1` | Orphanware/Eve serial port 1, A block | `$44` | `$45` | SCN2651: TxRDY `$01`, RxRDY `$02`, DCD `$40` active-low, DSR `$80` asserted | mode/command `$46`, `$47` |
| `2` | Micro Innovations serial port 1 | `$1B` | `$19` | 2681: RxRDY `$01`, TxRDY `$04`, TxEMT `$08`; DCD is input-port `$1D` bit 5 | writes `$18`, `$19`, `$1A`, `$1E`; modem inputs read at `$1D` |
| `3` | Local game | none | none | none | none |

The SCN2651 meanings are confirmed by the chip data sheet. Orphanware hardware
can be jumpered to A `$44-$47`, B `$54-$57`, C `$4C-$4F`, or D `$5C-$5F`;
the emulator currently models the A block so it does not collide with the
fixed ADAMLink `$5E/$5F` pair.

## Behavioral evidence

- Earlier inferred labels had the AdamLink pair reversed. The untouched
  AdamLink III executable resolves data as `$5E` and status/control as `$5F`:
  its receive loop tests `$5F` RxRDY before reading `$5E`, and its transmit
  loop tests `$5F` TxRDY before writing `$5E`. The Orphanware A block remains
  data `$44`, status `$45`, and mode/command `$46/$47`.
- Transmit dispatch waits on the corresponding status register before writing
  the outgoing byte to the selected data register.
- Orphanware/Eve setup also reads and writes the block's mode/command ports.
- MicroInnovations baud setup writes divisor/configuration values through
  `$18`, `$19`, `$1A`, and `$1E`, and reads `$1D`; observed cases include
  values associated with 300, 1200, and 2400-baud menu choices.
- ADAMLink setup writes its SCN2651 mode/command sequence through `$5F`.
- Local play reaches EOS controller polling without touching a modem port.

An independent `ADAMLINK` executable from `ANN Disk - 2024-04 - AdamLink III`
contains repeated direct reads and writes at `$5E/$5F`. Its runtime uses EOS
asynchronous keyboard services and exposes XMODEM send/receive commands. This
corroborates the documented ADAMLink pair rather than relying only on
ModemTank's inferred labels. With the corrected GearColeco AdamLink profile,
the untouched disk writes its initialization sequence to the control port,
consumes an injected terminal byte from the data port, and emits only actual
terminal output into the transmit queue. The same executable does not consume that byte
under the Orphanware A-block profile. Separating DSR bit 7 from active-low DCD
bit 6 fixes AdamLink III's false `Carrier lost` result and produces its real
`Modem online. Connected` state. Automation then reaches XMODEM SEND, DISK I,
enters the real `ADAMLINK` directory name at main RAM `$D034`, terminates it
with space/ETX, and reaches the A/H file-type screen. A complete XMODEM packet
exchange has not yet been executed under automation.

An instrumented boot also established the program's interrupt ownership. Once
loaded, AdamLink III runs with MIOC `$01`, replaces the writable NMI vector at
`$0066` with `JP $3C00`, and enables VDP NMI while continuing to use EOS
keyboard and block-device services. This proves that an EOS application can
own asynchronous VBlank. Amy's independent DSK/DDP feasibility test now also
proves the relevant memory contract: MIOC `$01` maps main RAM in both halves,
so writable `$0066` and Amy's resident `$C800-$DFFF` application remain visible
together while EOS block I/O continues. Amy therefore uses the same ownership
principle without copying AdamLink's implementation.

Rechecking the original 2024 ANN ZIP gives exact static counts in the 21,504-
byte executable: `$5E` is read twice and written twice; `$5F` is read seven
times and written thirteen times. Its 2,560-byte patch document confirms EOS
disk/Data Pack selection, XMODEM send/receive, cancellation with five control-X
bytes, and preservation of partial downloads. These counts corroborate the
hardware family; they do not replace a runtime serial-card model.

## Consequence for Amy Studio

Serial interfaces and modems are not equivalent to ordinary AdamNet block
devices. Amy needs a target-independent serial capability with separate
hardware backends, followed by an optional Hayes/AdamLink modem layer.

The first Amy byte-I/O layer now uses these operations:

| Operation | Purpose |
| --- | --- |
| `Present = serial present` | Detect an absent selected interface through its open-bus `$FF` status. |
| `Ready = serial readable` | Non-blocking receive-status query. |
| `Byte = serial read` | Receive one byte after the application observes readiness. |
| `Ready = serial writable` | Non-blocking transmit-status query. |
| `serial write Byte` | Send one byte after the application observes readiness. |
| `Connected = serial carrier` | Report SCN2651 active-low DCD on AdamLink/Eve or MIB3 input-port bit 5. |

The first implementation should expose status and errors instead of silently
waiting forever. ModemTank's blank wait state when an absent interface is
selected demonstrates why presence detection and timeout behavior are required.

## GearColeco serial backend

The experimental GearColeco core now provides explicit AdamLink,
Orphanware/Eve, and MicroInnovations serial profiles. The profile is resolved
inside the ADAM I/O layer before shared ColecoVision peripherals, so AdamLink's
`$44/$45` cannot silently reach the Lundy voice-module implementation.

The backend has fixed-size deterministic RX/TX queues, explicit carrier state,
scripted receive injection, transmit capture, observed configuration registers,
and loopback. The debugger offers offline and loopback choices for all three
cards. With no profile selected, the overlapping AdamLink ports remain open
instead of impersonating hardware.

The MIB3 status model deliberately does not synthesize carrier in status bit
`$20`: the SCN2681 defines that status bit as parity error. The MIB3 manual
maps serial port 1 Carrier Detect to bit 5 of the separate input-port register
at `$1D`. GearColeco now reflects its configured carrier state there, and Amy
uses that register for the Micro Innovations `serial carrier` predicate.

Primary references used for the correction:

- [Coleco ADAM Technical Reference Manual](https://www.colecovisionadam.com/Coleco/adam/Documents/Manual/Coleco_ADAM_Technical_Reference_Manual.pdf)
- [Coleco ADAMLink Modem manual](https://adamarchive.org/archive/Manuals/ADAM%20Hardware/Coleco%20ADAMLink%20Modem%20-%20Manual.pdf)
- [Orphanware Serial Interface 1 A/B](https://adamarchive.org/archive/Manuals/ADAM%20Hardware/Orphanware%20Serial%20Interface%201%20A-B.pdf)
- [Micro Innovations MIB3 manual](https://adamarchive.org/archive/Manuals/ADAM%20Hardware/Micro%20Innovations%20MIB3%20Interface%20Card%20-%20Manual.pdf)
- [Philips SCN2651 product specification](https://pdf.dzsc.com/SCN/SCN2651.pdf)

Still required before claiming complete modem emulation:

1. The state-driven scripted peer now completes XMODEM send: it reaches FILE,
   DISK I and filename/type selection, reads the selected 2,560-byte EOS
   document, initiates with NAK, validates and ACKs 20 blocks, compares every
   payload byte, receives EOT and supplies the final ACK. This proved AdamLink
   waits on SCN2651 TxEMT (`$04`) as well as TxRDY (`$01`); GearColeco now
   exposes both bits.

Modem Master 1.5 provides a second independent AdamLink implementation. Its
SmartBASIC loader contains injected Z80 routines using data port `$5E` and
status/control port `$5F`, including receive-ready, transmit-ready and carrier
tests. Its application menus cover direct dialing, terminal use, ASCII
XON/XOFF transfer and XMODEM. This makes it a useful end-to-end keyboard and
serial test without redistributing the original disk image.
GearColeco now boots this disk to its main menu and an automated SmartKey V
event reaches its real FILE TRANSFER menu, proving keyboard DCB input through a
second modem application. Protocol traffic itself remains the next boundary.
2. XMODEM receive is now verified as well: AdamLink requests CRC mode, accepts
   two CRC-16 packets, ACKs EOT, creates EOS file `RXTESTA`, and the exported
   mounted DSK contains the exact 256-byte payload. The media-export bridge is
   read-only from the host's perspective and also enables future debugger
   downloads of modified DSK/DDP images.
3. Error handling now covers bad-CRC NAK/retry, duplicate-block ACK without
   duplication, and double-CAN cancellation. AdamLink preserves the requested
   EOS filename with zero length when cancellation occurs before its first
   1 KiB EOS block is committed.
4. Mid-transfer save-state restoration is verified across UART state, protocol
   state and writable media. No-peer timeout is pinned at five total `C`
   requests, five NAK retries and CAN over 4,135 NTSC frames; AdamLink reports
   failure and closes the named partial EOS file at zero length.
5. Hayes command/result traffic is now deterministic: `AT`, `ATD`, and `ATH`
   produce `OK`, `CONNECT 1200`, and `NO CARRIER`; unknown commands produce
   `ERROR`. Carrier follows connect/hang-up, lowercase input is accepted, and
   a save state captured halfway through a dial command resumes correctly.
   Baud/framing timing remains to be verified.
6. ROM TEST & DEBUG now exposes the core's serial profile, carrier,
   RX/TX queue sizes, Hayes/loopback mode, and unfinished command length.
   Full captured-byte browsing remains optional future debugger work.

Save-state version 111 preserves the selected profile, loopback, carrier and
Hayes flags, partial Hayes command, configuration registers, and complete
RX/TX queues. Older ADAM states remain loadable and initialize newer serial
fields safely.

Amy keeps hardware selection in `target.hardware`, not in every statement.
`adamlink`, `eve-serial`, and `micro-serial` therefore compile the same source
to their verified ports and status masks. Open-bus presence detection, byte
I/O, readiness, carrier, loopback, captured traffic, and save states are now
verified. Deterministic Hayes traffic and real AdamLink III XMODEM are also
verified. UART setup and baud-sensitive framing remain the unfinished layer.

## Reproduction

Extract the files and trace the program with:

```text
node tools/extract-adam-eos-file.mjs "...E.O.S. Files.dsk" Tank build/adam-device-study/ModemTank-Tank.bin
node tools/test-adam-modemtank-interfaces.mjs build/adam-device-study/ModemTank-Tank.bin build/adam-device-study/AdamLink3.bin
node tools/test-gearcoleco-adam-serial.mjs
node tools/test-gearcoleco-adam-serial-state.mjs OS7.ROM EOS.ROM WP.ROM
node tools/test-gearcoleco-adam-hayes.mjs OS7.ROM EOS.ROM WP.ROM
node tools/probe-adamlink3-serial.mjs
node tools/probe-adamlink3-ui.mjs
node tools/test-modem-master-keyboard.mjs "Modem Master 1.5 (1989) (ADAMagic Software).dsk"
node tools/test-native-eos-amy-serial.mjs
node tools/trace-adam-firmware-services.mjs "...E.O.S. Files.dsk" 1800 --adam-keys=700:56
```

ADAM smart key IV is `GC_AdamKey` value `56`. The local path proves the EOS
keyboard/controller behavior without requiring unsupported modem hardware.
