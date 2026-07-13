; -----------------------------------------------------------------------------
; ALEXIS fixed-point 8.8 formatting helpers
; Depends on: coleco_math_format_u8.asm (AMY_U8_TO_ASCII3, AMY_U8_TO_ASCII2)
; -----------------------------------------------------------------------------

; Convert the fractional byte of an unsigned 8.8 value into 0..99 hundredths.
; Input:  A = fractional byte
; Output: A = floor((A * 100) / 256)
; Strategy: A*100 = A*64 + A*32 + A*4
;   compute A*4 into DE (saved), shift left to A*32 (pushed), to A*64,
;   pop A*32 into BC, add hl,bc (A*96), add hl,de (A*100), return H.
AMY_FX8_8_FRAC_TO_HUNDREDTHS:
    ld h,0
    ld l,a          ; HL = A
    add hl,hl
    add hl,hl       ; HL = A*4
    ld d,h
    ld e,l          ; DE = A*4
    add hl,hl
    add hl,hl
    add hl,hl       ; HL = A*32
    push hl
    add hl,hl       ; HL = A*64
    pop bc          ; BC = A*32
    add hl,bc       ; HL = A*96
    add hl,de       ; HL = A*100
    ld a,h          ; A = floor(A*100/256)
    ret

; Format an unsigned 8.8 fixed-point value as "iii.ff".
; Input:  HL = fixed 8.8 value
;         DE = destination buffer (6 bytes)
; Output: writes exactly 6 ASCII chars
AMY_FX8_8_TO_ASCII6:
    ld a,l
    push af
    ld a,h
    call AMY_U8_TO_ASCII3
    inc de
    ld a,'.'
    ld (de),a
    inc de
    pop af
    push de
    call AMY_FX8_8_FRAC_TO_HUNDREDTHS
    pop de
    jp AMY_U8_TO_ASCII2

; Format a signed 8.8 fixed-point value as "siii.ff".
; Input:  HL = fixed 8.8 value
;         DE = destination buffer (7 bytes)
; Output: writes exactly 7 ASCII chars, using leading space for non-negative values
AMY_SFX8_8_TO_ASCII7:
    bit 7,h
    jr z,AMY_SFX8_8_TO_ASCII7_POSITIVE
    ld a,'-'
    ld (de),a
    inc de
    xor a
    sub l
    ld l,a
    ld a,0
    sbc a,h
    ld h,a
    jp AMY_FX8_8_TO_ASCII6
AMY_SFX8_8_TO_ASCII7_POSITIVE:
    ld a,' '
    ld (de),a
    inc de
    jp AMY_FX8_8_TO_ASCII6
