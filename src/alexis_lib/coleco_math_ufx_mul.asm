; -----------------------------------------------------------------------------
; ALEXIS unsigned fixed 8.8 multiply helper
; Depends on: coleco_math_fx16_mul_helpers.asm
; -----------------------------------------------------------------------------

; Input:  HL = left, DE = right
; Output: HL = (left * right) >> 8
AMY_UFX8_8_MUL:
    call AMY_U16_MUL32_TO_TMP
    ld a,(AMY_FX16_MUL64+1)
    ld l,a
    ld a,(AMY_FX16_MUL64+2)
    ld h,a
    ret
