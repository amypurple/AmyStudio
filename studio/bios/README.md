# ColecoVision BIOS for ROM Test & Debug

Amy Studio does not distribute the copyrighted ColecoVision BIOS.

In the web IDE, open **Build > Open ROM / Debugger**. If no BIOS is configured,
Amy Studio asks you to choose your own 8192-byte (`8 KiB`) ColecoVision BIOS.
The BIOS is stored only in that browser profile so it does not need to be chosen
every session. It is never added to the Amy project, project export, or repository.
Use **Build > Load / Replace BIOS...** to select a different local copy.

For a locally served Studio, automatic loading is also supported by placing the
BIOS in this folder under either filename:

- `colecovision.rom`
- `os7.rom`

Known original ColecoVision BIOS MD5: `2c66f5911e5b42b8ebe113403548eee7`.