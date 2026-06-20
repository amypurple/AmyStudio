; -----------------------------------------------------------------------------
; ALEXIS NMI enable/disable helpers
; Manipulates BIOS VDP register 1 shadow ($73C4) bit 5 (interrupt enable).
; -----------------------------------------------------------------------------

; Clear VDP R1 interrupt-enable bit without touching screen-enable.
AMY_DISABLE_NMI:
    ld a,($73C4)
    and $DF
    ld c,a
    ld b,1
    call WRITE_REGISTER
    ret

; Set VDP R1 interrupt-enable bit and acknowledge pending VDP status.
AMY_ENABLE_NMI:
    ld a,($73C4)
    or $20
    ld c,a
    ld b,1
    call WRITE_REGISTER
    call READ_REGISTER
    ei
    ret
