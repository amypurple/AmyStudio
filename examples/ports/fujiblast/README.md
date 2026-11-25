# FujiBlast for ColecoVision + FujiNet

FujiBlast is a networked bomb-maze game for two to four players. This Amy
port is by Amy & Claude (2026), based on the FujiNet project's portable C
client and original ColecoVision Z80 client. The generated standalone
source retains the supplied credits.

From the repository root:

```sh
node tools/amyc.mjs examples/ports/fujiblast/fujiblast.alexis --target colecovision-fujinet --opt balanced --rom fujiblast.rom
```

The supplied 32 KiB ROM was built with Amy Studio r12.12. Its SHA-256 is
`c9abc8abbb995b4930424027edde51280d976f2fed5d49dd5390ab35d652e2a5`.
Use a ColecoVision FujiNet cartridge for network play. The delivery report
tested a simulated server; it did not validate the live FujiBlast server.
