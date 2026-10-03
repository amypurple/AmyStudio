# ADAM project forms reference

This suite separates two independent choices that older ADAM projects often mix together:

1. **Media:** disk (`.dsk`), Digital Data Pack (`.ddp`), cartridge (`.rom`), or a raw program/boot payload (`.bin`).
2. **Runtime:** native EOS, hybrid OS7 plus EOS storage, or a conventional OS7 ColecoVision cartridge.

Run `node tools/build-adam-project-forms.mjs`, then `node tools/test-adam-project-forms.mjs`.

| Artifact | Runtime | What it proves |
|---|---|---|
| `adam-eos-native-starter.dsk` | native EOS | Boots at `$C800`, calls EOS VDP services, and contains no OS7 game runtime |
| `adam-eos-native-starter.ddp` | native EOS | The identical program boots from linear Data Pack media |
| `adam-eos-native-starter.bin` | native EOS | The raw boot payload is independent of media packaging |
| `where-on-earth-os7-eos.dsk` | OS7+EOS hybrid | A ColecoVision-style game can use EOS to load separate question packs |
| `where-on-earth-os7-eos.ddp` | OS7+EOS hybrid | The same hybrid architecture works from Data Pack |
| `where-on-earth-colecovision.rom` | OS7 cartridge | The standalone cartridge remains a distinct deliverable |

Amy Studio now builds a multi-block native EOS application automatically when
the compiled program exceeds the 1 KiB BOOT record. The first stage copies a
loader to `$2000`; that loader reads up to six program blocks into
`$C800-$DFFF` through ADAMnet device `$04` (DSK) or `$08` (DDP), then jumps to
the Amy entry point. A 3,184-byte four-block Graphics II/ZX0 program is booted
and byte-verified on both media types. Larger native applications still need
an overlay or bank-aware loader rather than extending through EOS at `$E000`.

Native programs can now read a raw 1,024-byte media block with
`Buffer = read block N [status Result]`. The compiler selects disk device
`$04` or Data Pack device `$08` from the project target, so game code remains
media-independent. Exact block payloads are runtime-verified on both media.
The symmetric advanced command
`block write BlockNumber from Buffer [status Result]` writes exactly 1,024
bytes through EOS `$FCF6`. Its DSK/DDP round trip is runtime-verified, but it can
damage filesystem metadata when the caller does not own the selected block.

`Count = catalog Directory [status Result]` reads the standard EOS directory
from logical block 1 directly into a packed 1,024-byte `EosDirectory` record
and returns its entry count. Each `EosDirectoryEntry` is exactly 26 bytes: `Name[12]`,
`Attributes`, `StartBlock`, `Reserved[2]`, `AllocatedBlocks`, `UsedBlocks`,
`LastBlockBytes`, and `Metadata[3]`. `Entries[39]` occupies 1,014 bytes and
`Tail[10]` receives the directory terminator and completes the record.
`EosFile` is the related 23-byte record returned by an EOS file search; it
omits the three trailing directory-media bytes. All three record types are
supplied automatically by every native EOS ADAM project.

For ordinary game resources, native programs can instead use
`Buffer = read "LEVEL1" count Size status Result`. Amy initializes
the EOS file-control workspace, selects the project medium, opens the named
file, reads it, and closes it even when the read reports an error. A normal EOS
end-of-file result after the requested bytes are transferred counts as success.
Literal names use the native EOS base/extension encoding and are limited to ten
visible base/extension characters.

`Exists = exists "SAVE" status Result` queries the directory through EOS
`$FCCC`. A missing name is a normal false result with status zero; status one is
reserved for actual media errors. The absent/present/deleted lifecycle is
runtime-verified on DSK and DDP.

`Found = find "SAVE" as FileInfo [status Result]` performs the same search but
returns the complete 23-byte metadata in a built-in `EosFile`. Missing files
produce false/status zero and a cleared record; media errors produce status one.
`Bytes = size FileInfo` then computes the logical `u32` byte length from that
record without repeating the directory search.

`Size = size "LEVEL1" status Result` returns the logical byte length in a
`u32`. EOS `$FCCC` supplies a 23-byte directory record rather than a ready-made
32-bit length, so Amy combines the 16-bit used-block count at record offset 19
with the final-block byte count at offset 21. A 70,000-byte fixture proves that
the result crosses the 16-bit boundary on both media types. Empty and missing
files are also runtime-verified and remain distinguishable through status zero
versus one.

An existing allocated save file can be updated with
`write "SAVE" from Buffer count Size status Result`. The project media
must be writable. This operation overwrites bytes within the file's existing
allocation; it does not enlarge that allocation.

A program can allocate and later remove a file with
`create "SAVE" 1024 status Result` and
`delete "SAVE" status Result`. The current source-level size is 16-bit
(0 to 65,535 bytes), or it can be supplied through a `u32` variable. The latter
passes EOS all four bytes and a 70,000-byte allocation lifecycle is verified on
writable DSK and DDP images. Existing-file growth and an
EOS application that deliberately switches memory configurations remain separate
work; they should not be represented as aliases of these forms.

`rename "OLD" to "NEW" status Result` updates an existing directory entry
through EOS `$FCDE` without copying its contents. Amy selects DSK or DDP from
the project target. A complete rename lifecycle is runtime-verified on both;
an absent-name lookup takes substantially longer on sequential Data Pack media.
The status clause is optional for both `rename` and `delete`.

Native EOS applications can also wait for a full-keyboard character with
`KeyCode = await key`, optionally followed by `status Result`. This is intentionally blocking and
is runtime-verified with GearColeco keyboard injection. Real-time applications
can instead use `key reset`, `Request = key start`, and
`KeyCode = key poll Request status Result`. The poll status distinguishes ready (`0`), pending (`1`),
and error (`2`) without stopping animation or controller processing.

The standard AdamNet printer is available directly from Amy source:
`print "AMY" to printer status Result` sends a literal, while
`print Character to printer` sends one byte. EOS `$FC66` performs device `$02`
busy handling. Exact output and success status are runtime-verified from both
DSK and DDP boot media.
