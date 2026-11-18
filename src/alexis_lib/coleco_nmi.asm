; -----------------------------------------------------------------------------
; ALEXIS NMI enable/disable helpers
; Manipulates BIOS VDP register 1 shadow ($73C4) bit 5 (interrupt enable).
; -----------------------------------------------------------------------------

; Clear VDP R1 interrupt-enable bit without touching screen-enable.
AMY_DISABLE_NMI:
    ld a,($73C4)
    and $DF
    ld ($73C4),a
    ld c,a
    ld b,1
    call WRITE_REGISTER
    ret

; Set VDP R1 interrupt-enable bit. A pending VBlank must remain latched so the
; VDP can deliver it immediately after interrupt enable is restored.
AMY_ENABLE_NMI:
    ld a,($73C4)
    or $20
    ld ($73C4),a
    ld c,a
    ld b,1
    call WRITE_REGISTER
    ei
    ret
