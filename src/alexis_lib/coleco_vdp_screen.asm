; -----------------------------------------------------------------------------
; ALEXIS simple screen on/off VDP helpers
; -----------------------------------------------------------------------------

; Direct screen control that preserves existing sprite size/zoom bits in VDP R1.
AMY_SCREEN_OFF_NO_NMI:
    ld a,($73C4)
    and $9F
    ld c,a
    ld b,1
    jp WRITE_REGISTER

AMY_SCREEN_ON_NMI:
    ld a,($73C4)
    or $60
    ld c,a
    ld b,1
    call WRITE_REGISTER
    call READ_REGISTER
    ei
    ret
