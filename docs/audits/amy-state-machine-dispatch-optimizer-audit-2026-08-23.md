# Amy state-machine dispatch optimizer audit

Date: 2026-08-23

## Scope

This audit covers only typed `dispatch State using Machine`. Existing `on ... goto`
and `on ... gosub` statements retain their established codegen so existing projects do
not change.

The Z80 has `JP (HL)` but no `CALL (HL)`. Zilog documents `JP (HL)` as a one-byte,
4-T-state instruction. SDCC likewise lowers indirect Z80 calls through a helper ending
in `JP (HL)`. Amy avoids a reusable trampoline by pushing the continuation address and
jumping to the selected handler; the handler's ordinary `RET` consumes that address.

References:

- https://www.zilog.com/docs/z80/um0080.pdf
- https://sourceforge.net/p/sdcc/bugs/4027/
- https://download.file-hunter.com/Books/EN/A%20Programmer%27s%20Guide%20to%20the%20MSX%20System_3.pdf

## Selected hybrid

Machines containing one through eight states use a linear chain:

```asm
    ld a,(State)
    ld hl,Done
    push hl
    dec a
    jp z,Handler1
    dec a
    jp z,Handler2
    ; ...
    pop hl              ; zero or out of range
Done:
```

Machines containing nine through 255 states use a bounded word-address table. After
loading the selected address into HL, Amy emits:

```asm
    ld de,Done
    push de
    jp (hl)
Done:
```

This replaces the previous `CALL trampoline` / `JP done` / trampoline `JP (HL)` tail.
The threshold is conservative: with the pushed-return sequence, the linear form remains
smaller through eight entries; at nine entries the forms are approximately equal and
the table has bounded lookup time.

## Four-state self-test sizes

Measured with `amy-state-machine-selftest`:

| Optimizer | Before hybrid | After hybrid | Change |
|---|---:|---:|---:|
| Off | 845 | 833 | -12 bytes |
| Safe | 845 | 833 | -12 bytes |
| Balanced | 839 | 829 | -10 bytes |
| Aggressive | 838 | 829 | -9 bytes |
| Experimental | 836 | 827 | -9 bytes |

## Optimizer integrity result

All five profiles preserve exactly four ordered `DEC A` / `JP Z,handler` pairs and the
single pushed continuation. Aggressive and Experimental do **not** remove, merge, or
skip any state-machine branch. Their additional ROM savings occur elsewhere in the
self-test, not by altering the dispatch semantics.

The regression test also verifies:

- every handler remains present under all optimization profiles;
- no word table is emitted for four states;
- a nine-state machine does emit a word table;
- the large-machine path uses `LD DE,done / PUSH DE / JP (HL)` and no empty or stale
  trampoline;
- invalid machines fail closed.

Test command:

```text
node tools/test-state-machine-codegen.mjs
```

Full catalog result after the compiler change: 195 passed, 0 failed.
