# Claude toolbox comparison, 2026-11-25

Compared the delivered Claude toolbox inventory and testing guide with the
tracked clean AmyStudio Agent Kit. Reported test results below describe the
delivery, not an independent rerun.

| Capability | Decision |
| --- | --- |
| VDP checker late attach, twin timing proof, single-step reference | Highest priority. Port and test the frame-boundary and NMI re-hit handling against our current checker. A checker can produce false failures if it advances an extra frame or counts an interrupted instruction twice. Do not replace the canonical checker until the two independent proofs pass on our core. |
| Clean-room rebuild | Add to the delivery workflow. Rebuild from explicitly listed inputs, report toolchain identity and first differing ROM offset. Keep existing author checks for normal development. |
| Finite-state soft-lock search | Add as an optional puzzle skill with a small crate-puzzle example. Require exhaustive reachable-state coverage or report inconclusive; model results do not replace a ROM bot. |
| Per-label PC hit counts, exclusive cycle totals, and synchronized PNG/VRAM/register captures | Extend and document existing profiler and visual-proof entry points rather than vendoring a second emulator loader. Record bank context for MegaCart traces. |
| Frame audit and full-height French accents | Isolate reusable recipes from game-specific scripts. Test accent glyph rows and use the sprite-layer frame audit as optional visual evidence. |
| CRT checks, image conversion, compression, contact sheets, OS7 scores | Existing overlap. Compare individual capabilities against current tools; no wholesale import. |
| SUBLEVEL 9 and Thunder Crag music drivers | Keep as opt-in advanced examples until size, NMI cost, and bank-switch safety are measured with the current runtime. |
| Patched compiler snapshot | Do not vendor. Use the current Amy Studio compiler and stage a versioned test core separately. Keep the OS7 BIOS user-supplied. |

First integration should be a small fixture for the checker boundary and NMI
cases, followed by the portable rebuild recipe. Claude reports 25 self-test
checks and provides a reference counter; rerun with our test core and a local
BIOS before sharing the tools as supported kit features.
