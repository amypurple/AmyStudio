; -----------------------------------------------------------------------------
; ALEXIS additional screen-control helpers
; Reads BIOS VDP register 1 shadow ($73C4) to preserve existing flags.
; -----------------------------------------------------------------------------

; Turn screen on without changing NMI enable state.
; Sets VDP R1 bit 6 (screen enable), clears bit 5 (no-NMI-override).
AMY_SCREEN_ON_NO_NMI:
    ld a,($73C4)
    or $40
    and $DF
    ld c,a
    ld b,1
    jp WRITE_REGISTER
