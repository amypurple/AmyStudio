; -----------------------------------------------------------------------------
; ALEXIS fixed 8.8 multiply helper
; Depends on: coleco_math_fx16_mul_helpers.asm
; -----------------------------------------------------------------------------

AMY_FX8_8_MUL_SIGN EQU AMY_BUFFER32+24

; Signed fixed 8.8 multiply.
; Input:  HL = left, DE = right
; Output: HL = (left * right) >> 8
AMY_FX8_8_MUL:
    xor a
    ld (AMY_FX8_8_MUL_SIGN),a
    bit 7,h
    jr z,AMY_FX8_8_MUL_CHECK_RIGHT
    call AMY_FX8_8_NEG_HL
    ld a,1
    ld (AMY_FX8_8_MUL_SIGN),a
AMY_FX8_8_MUL_CHECK_RIGHT:
    bit 7,d
    jr z,AMY_FX8_8_MUL_DO
    ex de,hl
    call AMY_FX8_8_NEG_HL
    ex de,hl
    ld a,(AMY_FX8_8_MUL_SIGN)
    xor 1
    ld (AMY_FX8_8_MUL_SIGN),a
AMY_FX8_8_MUL_DO:
    call AMY_U16_MUL32_TO_TMP
    ld a,(AMY_FX16_MUL64+1)
    ld l,a
    ld a,(AMY_FX16_MUL64+2)
    ld h,a
    ld a,(AMY_FX8_8_MUL_SIGN)
    or a
    ret z
    jp AMY_FX8_8_NEG_HL

AMY_FX8_8_NEG_HL:
    ld a,l
    cpl
    ld l,a
    ld a,h
    cpl
    ld h,a
    inc hl
    ret
