# FujiNet ColecoVision reference games

This note records conclusions from the upstream `servers`,
`fujinet-multiplayer-mule` and `fujinet-fujiblast` repositories downloaded on
2026-11-19. They are reference evidence, not vendored Amy Studio source.

## Existing ColecoVision clients

- Multiplayer M.U.L.E. already includes a stock-ColecoVision Z80 client and a
  deterministic server. It is GPLv3, contains no original Electronic Arts code
  or graphics, and can build with stand-in art. The complete client uses a
  56 KiB APPBANK image.
- FujiBlast already includes a ColecoVision Z80 client, original TMS9918 art
  and sound, a Go server, bots and emulator rigs. Its stream protocol uses COBS
  framing, Fletcher-16, state patches, commits, action sequence numbers,
  keepalives, flow control and resynchronization. No explicit repository
  license was found in the downloaded archive, so do not redistribute or copy
  its implementation until its license is confirmed.

## Corrections learned

FujiBus command parameters are size-prefixed. A byte parameter is encoded as
`1,value`; a word parameter is `2,low,high`. Raw TX bytes are payload only.
The ColecoVision mailbox include now exposes `FN_PARAM8` and `FN_PARAM16`, and
Amy Chess FujiNet uses them for OPEN, STATUS, READ and WRITE.

## Amy Studio support now available

1. `colecovision-fujinet-appbank` is separate from the flat 30 KiB target.
2. Studio and CLI package the resident window plus 8 KiB pages and preserve
   `$F800-$FFFF`.
3. `FN_SELECT_APPBANK_PAGE` selects pages explicitly. Startup code must select
   page zero because console RESET does not reset physical cartridge state.
4. ROM Test & Debug has an offline FujiNet test device for mailbox and APPBANK
   validation. Real server transport remains an external/hardware test.

## Remaining higher-level libraries
1. Add appkey helpers for the shared player name and selected room URL.
2. Add a reusable asynchronous N: transport. READ must never request more than
   STATUS reports available; older firmware can consume and discard a short
   read that asked for too much.
3. Add optional COBS/Fletcher framing, sequence suppression, keepalive,
   reconnect and full-state resynchronization for real-time games.
4. Validate server-facing behavior with physical FujiNet or a compatible
   external device. Use the existing Coleco clients as behavior/timing oracles.

## Product direction

Do not label an Amy project `M.U.L.E.` unless its legal status and presentation
are settled. A compatible original colony-economy game can reuse the documented
network architecture and game concepts while using original rules, identity,
art and music. FujiBlast is already a complete cross-platform game; the useful
Amy Studio goal is protocol/tooling compatibility and an independently authored
Coleco example, not an unlicensed source transplant.
