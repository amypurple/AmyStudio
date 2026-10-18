# Mystery Spell EOS dictionary format

This is the proposed external dictionary contract for the ADAM build. The
cartridge's 318 built-in words remain the fallback and the three existing
20-word custom-list files remain independently writable.

All multi-byte integers are little-endian. Text is uppercase ASCII, one to 13
letters per word. The loader must reject the complete file on the first invalid
offset, count, length or character rather than use partially validated data.

| Offset | Size | Meaning |
| ---: | ---: | --- |
| 0 | 4 | Magic `MSD1` |
| 4 | 1 | Format version, initially 1 |
| 5 | 1 | Topic count, 1 to 32 |
| 6 | 2 | Directory byte size |
| 8 | 2 | Reserved, must be zero |

Each directory entry contains a one-byte topic-name length, up to 20 uppercase
characters, a 16-bit word count, and a 32-bit byte offset to that topic's word
stream. A word stream stores one length byte followed by its letters, repeated
for the declared count. Topics may therefore be sought without loading earlier
topics.

The runtime should load only the selected topic into a bounded RAM window. Its
index contains 16-bit offsets into that window, so random selection never scans
the whole media file during play. A topic that exceeds the available window is
reported as unavailable; it must not silently truncate. A missing, unsupported
or malformed file returns to the embedded eight-topic dictionary.

Before this format becomes public, tests must cover valid maximum-sized words,
empty and oversized topics, truncated headers and streams, offsets outside the
file, invalid characters, duplicate topics, unsupported versions, read errors,
and a complete fallback boot with no dictionary file present.
