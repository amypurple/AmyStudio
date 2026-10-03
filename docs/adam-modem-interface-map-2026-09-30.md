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
| `0` | Coleco AdamLink | `$5F` | `$5E` | SCN2651: TxRDY `$01`, RxRDY `$02`, DCD `$40` active-low | same pair |
| `1` | Orphanware/Eve serial port 1, A block | `$44` | `$45` | SCN2651: TxRDY `$01`, RxRDY `$02`, DCD `$40` active-low | mode/command `$46`, `$47` |
| `2` | Micro Innovations serial port 1 | `$1B` | `$19` | 2681: RxRDY `$01`, TxRDY `$04`, TxEMT `$08` | writes `$18`, `$19`, `$1A`, `$1E`; modem inputs read at `$1D` |
| `3` | Local game | none | none | none | none |

The SCN2651 meanings are confirmed by the chip data sheet. Orphanware hardware
can be jumpered to A `$44-$47`, B `$54-$57`, C `$4C-$4F`, or D `$5C-$5F`;
the emulator currently models the A block so it does not collide with the
fixed ADAMLink `$5E/$5F` pair.

## Behavioral evidence

- Receive dispatch in the studied software used conflicting inferred labels.
  Primary documentation resolves ADAMLink as control/status `$5E` and data
  `$5F`, while the Orphanware A block uses data `$44`, status `$45`, and
  mode/command `$46/$47`.
- Transmit dispatch waits on the corresponding status register before writing
  the outgoing byte to the selected data register.
- Orphanware/Eve setup also reads and writes the block's mode/command ports.
- MicroInnovations baud setup writes divisor/configuration values through
  `$18`, `$19`, `$1A`, and `$1E`, and reads `$1D`; observed cases include
  values associated with 300, 1200, and 2400-baud menu choices.
- ADAMLink setup writes its SCN2651 command sequence through `$5E`.
- Local play reaches EOS controller polling without touching a modem port.

An independent `ADAMLINK` executable from `ANN Disk - 2024-04 - AdamLink III`
contains repeated direct reads and writes at `$5E/$5F`. Its runtime uses EOS
asynchronous keyboard services and exposes XMODEM send/receive commands. This
corroborates the documented ADAMLink pair rather than relying only on
ModemTank's inferred labels. With the corrected GearColeco ADAMLink profile,
the untouched disk emits six initialization bytes and consumes an injected
terminal byte. The same executable neither transmits nor consumes that byte
under the Orphanware A-block profile. The XMODEM transfer path has not yet
been executed under automation.

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

Provisional operations, not language syntax commitments:

| Operation | Purpose |
| --- | --- |
| `serial.present` | Detect whether the selected backend can be used. |
| `serial.configure` | Select backend, port, baud, framing, and handshake. |
| `serial.read_ready` | Non-blocking receive-status query. |
| `serial.read` | Receive one byte with explicit timeout/error result. |
| `serial.write_ready` | Non-blocking transmit-status query. |
| `serial.write` | Send one byte with explicit timeout/error result. |
| `serial.carrier` | Report carrier/handshake state where hardware supports it. |
| `modem.command` | Send Hayes commands or an AdamLink-specific equivalent. |

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
`$20`: the SCN2681 defines that bit as parity error. MIB3 modem signals belong
to the separate input-port register at `$1D`; their board-specific wiring and
polarity remain to be established before Amy exposes a carrier predicate for
that profile.

Primary references used for the correction:

- [Coleco ADAM Technical Reference Manual](https://www.colecovisionadam.com/Coleco/adam/Documents/Manual/Coleco_ADAM_Technical_Reference_Manual.pdf)
- [Coleco ADAMLink Modem manual](https://adamarchive.org/archive/Manuals/ADAM%20Hardware/Coleco%20ADAMLink%20Modem%20-%20Manual.pdf)
- [Orphanware Serial Interface 1 A/B](https://adamarchive.org/archive/Manuals/ADAM%20Hardware/Orphanware%20Serial%20Interface%201%20A-B.pdf)
- [Micro Innovations MIB3 manual](https://adamarchive.org/archive/Manuals/ADAM%20Hardware/Micro%20Innovations%20MIB3%20Interface%20Card%20-%20Manual.pdf)
- [Philips SCN2651 product specification](https://pdf.dzsc.com/SCN/SCN2651.pdf)

Still required before claiming complete modem emulation:

1. Execute AdamLink III and ModemTank against each matching profile and refine
   remaining setup semantics from traces rather than names inferred from polling.
2. Add serial state and captured traffic to the ADAM debugger inspector.
3. Model transmission timing and framing where software depends on baud rate.

Save-state version 109 preserves the selected profile, loopback and carrier
flags, configuration registers, and complete RX/TX queues. Older ADAM states
remain loadable and resume with no serial card selected.

Amy serial syntax remains intentionally deferred until those runtime traces
confirm the public status/error contract.

## Reproduction

Extract the files and trace the program with:

```text
node tools/extract-adam-eos-file.mjs "...E.O.S. Files.dsk" Tank build/adam-device-study/ModemTank-Tank.bin
node tools/test-adam-modemtank-interfaces.mjs build/adam-device-study/ModemTank-Tank.bin build/adam-device-study/AdamLink3.bin
node tools/test-gearcoleco-adam-serial.mjs
node tools/test-gearcoleco-adam-serial-state.mjs OS7.ROM EOS.ROM WP.ROM
node tools/probe-adamlink3-serial.mjs
node tools/trace-adam-firmware-services.mjs "...E.O.S. Files.dsk" 1800 --adam-keys=700:56
```

ADAM smart key IV is `GC_AdamKey` value `56`. The local path proves the EOS
keyboard/controller behavior without requiring unsupported modem hardware.
