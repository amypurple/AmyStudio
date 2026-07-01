# Amy NMI Runtime Contract - 2026-06-22

## Scope

This note records the current Amy NMI runtime shape, the lib4ksa legacy model it
comes from, and the contract for Amy-level per-VBlank hooks.

## Current Amy NMI Shapes

Amy currently emits generated `Nmi:` bodies from
`studio/core/project.js`, depending on inferred runtime capability needs.

### 1. Ack-only NMI

Used when a program needs interrupts/status/frame timing but does not need
controllers or sound.

Shape:

```asm
Nmi:
        push af
        ld a,($701F)
        cp $A5
        jr nz,AMY_NMI_ACK_ONLY_READ_STATUS
        pop af
        ret
AMY_NMI_ACK_ONLY_READ_STATUS:
        in a,(VDP_CTRL_PORT)
        ; optional NMI_FLAG/VDP_STATUS shadow
        ; optional frame counter update, wrapped with push hl / pop hl
        pop af
        ret
```

Important: `$701F` is not `NO_NMI`. It is the last byte of `AMY_BUFFER32` and is
used as a temporary VDP I/O guard. Helpers that perform fragile VDP address/data
port sequences set `$701F = $A5` before the sequence and clear it after the
sequence. If NMI fires during that window, the generated NMI returns without
reading VDP status, avoiding disruption of the VDP address latch.

### 2. Hook-only NMI

Used when a program registers only `on vblank SubName` / `on frame SubName` and does not need controller polling, music, sound, frame counter, timers, or spinner support. This path preserves `AF`, `BC`, `DE`, `HL`, `IX`, and `IY`, calls the user hook in the normal register set, and intentionally avoids the alternate-register `exx` wrapper.

### 3. Compact controller NMI

Used when the program only needs controller/keypad polling, without sound,
music, spinner, or frame counter.

This keeps the NMI smaller than the full legacy wrapper, but still preserves
`AF`, `BC`, `DE`, and `HL` around `UPDATE_CONTROLLERS` and the Amy controller
decode path.

This compact form is not suitable for a user VBlank hook, because it does
not preserve `IX`, `IY`, or alternate registers.

### 4. Full runtime NMI

Used when sound/music, fuller runtime state, or frame/sound combinations are
needed.

Current order:

```asm
Nmi:
        push af
        ld a,($701F)
        cp $A5
        jr nz,AMY_NMI_READ_STATUS
        pop af
        ret
AMY_NMI_READ_STATUS:
        in a,(VDP_CTRL_PORT)
        ; optional NMI_FLAG/VDP_STATUS shadow
        push bc
        push de
        push hl
        push ix
        push iy
        ex af,af'
        push af
        exx
        push bc
        push de
        push hl
        ; optional controllers
        ; optional frame counter
        ; optional music update
        ; optional sound update
        pop hl
        pop de
        pop bc
        exx
        pop af
        ex af,af'
        pop iy
        pop ix
        pop hl
        pop de
        pop bc
        pop af
        ret
```

This is the only current generated form close enough to the old lib4ksa
`crtcv.s` wrapper to safely host arbitrary compiled Amy code later.

## Legacy lib4ksa Comparison

`src/vendor/cvdevkit_sdcc/lib4ksa/crtcv.s` does:

1. `push af`
2. set `_nmi_flag`
3. call BIOS `READ_REGISTER` (`$1FDC`) and store `_vdp_status`
4. check `_no_nmi`
5. set `_no_nmi = 1` while running the body
6. save `BC`, `DE`, `HL`, `IX`, `IY`, alternate `AF`, alternate `BC/DE/HL`
7. update controllers and decode controller/keypad state
8. call the C `_nmi` hook
9. call BIOS sound update routines
10. restore registers
11. clear `_no_nmi`
12. optionally re-enable interrupts for spinner support
13. restore `AF`, return

The key difference is that legacy `crtcv.s` had an explicit user hook and used
`_no_nmi` as a reentrancy guard around that hook. Amy now supports `on vblank SubName` / `on frame SubName`, so the full generated NMI can call a parameterless Amy hook. The hook is guarded with `NO_NMI` to prevent reentrancy while still keeping runtime updates centralized in the generated hardware `Nmi:` body.

## Wait/Delay Contract

`src/alexis_lib/coleco_wait.asm` follows the same practical contract as
`src/vendor/cvdevkit_sdcc/lib4ksa/delay.s`:

- if VDP R1 NMI enable is set, wait through `NMI_FLAG`
- if NMI is disabled, poll the VDP status register directly
- therefore `wait` and `wait N frames` must not hang merely because a program
  deliberately has display or NMI disabled during loading/setup

## Current Risks

- The `$701F = $A5` VDP I/O guard must not be mistaken for `NO_NMI`.
- A user hook that also needs controllers, timers, music, sound, frame counter, or spinner support must use the full NMI wrapper. A hook-only program uses the smaller hook-only NMI path.
- A user hook must not run while `$701F = $A5`, because reading VDP status or
  performing additional VDP I/O in the hook could corrupt the active VDP latch
  sequence.
- The previously fixed `HL` preservation is mandatory: any NMI branch that
  writes `HL`, including a frame counter update, must preserve it before touching
  it.

## Amy VBlank Hook

Prefer a source-level declaration that does not expose or collide with the
hardware label:

```basic
on vblank GameTick

sub GameTick:
  ' short per-frame logic
  return
```

Do not use `sub Nmi:` as the user-facing form. `Nmi` is the generated hardware
entry label and should remain runtime-owned.

Implementation rules:

- `on vblank SubName` sets `needsUserFrameHook = true`; `on frame SubName` is an accepted alias.
- `needsUserFrameHook` forces `needsNmi = true` and disables compact NMI forms.
- Generated NMI order should be: VDP I/O guard check, VDP status acknowledge,
  save full register set, update controllers, update frame counter, set
  `NO_NMI = 1`, call user hook, clear `NO_NMI`, update music/sound, restore
  registers.
- If `NO_NMI` is already nonzero, skip the user hook but still keep the runtime
  updates that are safe and expected for the active NMI branch.
- Inline ASM inside a frame hook is advanced/unsafe unless it follows the same
  register and VDP timing contract as any interrupt-time code.

## Short-Term Verdict

Amy keeps using plain `ret` for NMI exits because this project has validated it on real ColecoVision hardware and it is smaller than `retn`. The runtime preserves `HL` in the places that matter, `wait` has safe NMI-on/NMI-off behavior, and `on vblank` uses either the hook-only path or the full wrapper with the `NO_NMI` guard described above.
