# Crate Switch

Push the crate onto + with the D-pad. Either fire button resets the room.

From the repository root:

```sh
node tools/amyc.mjs examples/ports/crate-switch/crate-switch.alexis --opt balanced --rom crate-switch.rom
node examples/ports/crate-switch/smoke.mjs crate-switch.rom path/to/OS7.ROM
python -I tools/amy-author-softlock.py examples/ports/crate-switch/model.py
```

The finite-state model has 198 reachable states. With `CRATE_NO_RESET=1`
it has 98 trapped states; with reset it has none. The separate ROM test
drives both fire buttons and checks the trap, reset, and win in VRAM.
Only use trusted Python models. The OS7 BIOS is not bundled.

Inspired by Claude's November 25 toolbox. Its clean-room rebuild checker
also reproduced the experimental ROM byte for byte.
