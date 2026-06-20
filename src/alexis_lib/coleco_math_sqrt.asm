; -----------------------------------------------------------------------------
; ALEXIS sqrt helpers
; -----------------------------------------------------------------------------

; Compute floor(sqrt(HL)).
; Adapted from cvdevkit_sdcc/getput11/gpsqrt16.s.
; Input:  HL = unsigned 16-bit value
; Output: HL = integer square root (0..255)
AMY_U16_SQRT:
    ld de,$0040
    ld a,l
    ld l,h
    ld h,0
    or a
    ld b,8
AMY_U16_SQRT_LOOP:
    sbc hl,de
    jr nc,AMY_U16_SQRT_KEEP
    add hl,de
AMY_U16_SQRT_KEEP:
    ccf
    rl d
    add a,a
    adc hl,hl
    add a,a
    adc hl,hl
    djnz AMY_U16_SQRT_LOOP
    ld h,0
    ld l,d
    ret
