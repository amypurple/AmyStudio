# TI-99/4A Amy ports

These projects preserve and adapt programs published for the TI-99/4A in
early-1980s magazines. Each directory entry includes the Amy source and, when
available, the source BASIC listing used as the historical reference.

| Project | Amy target | Historical source | Initial Balanced ROM |
| --- | --- | --- | ---: |
| Jumping Jack | ColecoVision | Paul Burger, 1983 | 2,830 bytes |
| Gold Miner | ColecoVision | Joseph Weber / James Dunn, 1982–1983 | 3,915 bytes |
| First Math | ColecoVision | Steve Hamilton, 1983 | 4,799 bytes |
| Southern States | ColecoVision and OS7+EOS hybrid | C. Regena, 1983 | 5,120 bytes |
| Diamond Drop | ColecoVision | Matt Giwer / Patrick Parrish, 1983 | 5,122 bytes |
| Mystery Spell | ColecoVision and OS7+EOS hybrid | Doug Hapeman, 1983 | 11,669 bytes |

The six cartridge builds compile with the Safe, Balanced and Aggressive
profiles. Their combined assembled sizes are 34,047, 33,455 and 33,420 bytes,
respectively. `tools/test-ti99-ports-runtime.mjs` boots every cartridge through
the real OS7 delay, advances its opening controls and verifies multiple nonblank
rendered states. `tools/test-ti99-adam-ports-runtime.mjs` additionally builds
writable expansion DSK images for Southern States and Mystery Spell, boots them
through EOS and verifies that both hybrid programs reach their own screens.

These tests establish compilation, boot and initial interaction. They do not
yet claim complete gameplay parity: score progression, every answer path,
game-over/restart behavior and the original TI listing still require individual
scripted scenarios. The explicit `screen on` initialization is intentional. Amy
now restores the VDP display, VDP NMI and CPU interrupts correctly, so these
programs no longer depend on the older workaround for a partially enabled
screen.

Mystery Spell was imported after Amy's static-ABI named-constant fix. Its source
therefore uses symbolic arguments such as `ShowBand(TopRowY)` and
`MoveFaceY(FaceHomeY)` instead of the literal-value workaround found in the
downloaded revision. The ADAM build currently contains 318 built-in words in
eight topics and three writable 20-word list slots. A larger ADAM-only dictionary
should use an EOS media file rather than inflate the ColecoVision cartridge
data. The intended format is a small topic directory followed by length-prefixed
words (maximum 13 letters), allowing one topic to be loaded into a bounded RAM
window while the embedded dictionary remains the cartridge fallback. The file
must carry a magic value and version so malformed dictionaries fail safely back
to the built-in words. The proposed binary contract is recorded in
`mystery-spell-eos-dictionary.md`; it is a design for the next implementation,
not a claim that arbitrary external dictionaries are already accepted.
