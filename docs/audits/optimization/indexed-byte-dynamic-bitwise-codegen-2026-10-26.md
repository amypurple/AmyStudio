# Indexed byte dynamic bitwise code generation (2026-10-26)

## Verdict

Primitive `u8` and `i8` arrays now calculate their indexed destination once for dynamic `&=`,
`|=`, and `^=` assignments:

```amy
Map[Index] |= TileMask
Values[Index] &= RuntimeMask
Values[Index] ^= Flags
```

The emitter loads and preserves the byte operand, calculates the element address once in `HL`,
then reads, modifies, and writes `(HL)`. The prior generic path calculated the same indexed address
once for the read and again for the write.

The rule requires a primitive byte array and a byte operand. Record fields, wider values,
expressions without a proven byte type, and cross-statement reuse retain their existing paths.

## Measurements

`Worm of Bemer` contains five active sites and falls from 12,411 to 12,366 occupied bytes under
Balanced optimization, saving 45 bytes. It is the only current corpus ROM affected; no ROM grows.
The Balanced corpus total falls from 1,762,456 to 1,762,411 bytes.

Amy Chess and all six toolchain comparison ROMs are unchanged.

## Correctness evidence

- `tools/test-byte-compound-bitwise-codegen.mjs` proves exact RAM results and one-address emitted
  shapes for all three operators under Off, Safe, Balanced, Aggressive, and Experimental profiles.
- Full Aggressive corpus: 299/299 examples compile and 298 ROMs assemble.
- Post-optimizer execution oracles: 297/297 pass, including `Worm of Bemer` and Amy Chess.
- GearColeco runtime gates pass after rerunning outside the restricted process sandbox.
- The MDL ROM runtime self-test passes 1/1.

## Design lesson

The useful optimization remains at the typed emitter boundary. It is deterministic and avoids
global allocation search; a late assembly peephole cannot safely infer the array element type,
operand width, and expression boundary needed by this proof.
