; -----------------------------------------------------------------------------
; ALEXIS signed 16-bit formatting helper
; Depends on: coleco_math_format.asm (AMY_U16_TO_ASCII5)
; -----------------------------------------------------------------------------

; Convert a signed 16-bit value to six ASCII characters (sign + 5 digits).
; Input:  HL = signed 16-bit value
;         DE = destination buffer (6 bytes)
; Output: writes sign char ($20 or $2D) then 5 zero-padded ASCII digits
AMY_I16_TO_ASCII6:
    bit 7,h
    jr nz,AMY_I16_TO_ASCII6_NEG
    ld a,$20
    ld (de),a
    inc de
    jp AMY_U16_TO_ASCII5
AMY_I16_TO_ASCII6_NEG:
    ld a,$2D
    ld (de),a
    inc de
    ld a,l
    cpl
    ld l,a
    ld a,h
    cpl
    ld h,a
    inc hl
    jp AMY_U16_TO_ASCII5
