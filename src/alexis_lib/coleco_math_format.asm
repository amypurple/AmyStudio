; -----------------------------------------------------------------------------
; ALEXIS numeric formatting helpers
; -----------------------------------------------------------------------------

; Convert an unsigned 16-bit value to five ASCII digits.
; Adapted from cvdevkit_sdcc/getput11/gputoa0.s and lib4ksa/utoa.s.
; Input:  HL = unsigned 16-bit value
;         DE = destination buffer (5 bytes)
; Output: writes exactly 5 ASCII digits, including leading zeros
AMY_U16_TO_ASCII5:
    ld bc,$2710
    call AMY_U16_TO_ASCII5_COUNT_SUB
    ld bc,$03E8
    call AMY_U16_TO_ASCII5_COUNT_SUB
    ld bc,$0064
    call AMY_U16_TO_ASCII5_COUNT_SUB
    ld c,$0A
    call AMY_U16_TO_ASCII5_COUNT_SUB
    ld a,l
    add a,$30
    ld (de),a
    ret

AMY_U16_TO_ASCII5_COUNT_SUB:
    xor a
AMY_U16_TO_ASCII5_COUNT_SUB_LOOP:
    sbc hl,bc
    inc a
    jr nc,AMY_U16_TO_ASCII5_COUNT_SUB_LOOP
    dec a
    add hl,bc
    add a,$30
    ld (de),a
    inc de
    ret

; other format routines are in separate files:
;   coleco_math_format_u8.asm   — AMY_U8_TO_ASCII3, AMY_U8_TO_ASCII2  (used by i8 and fix8_8 print)
;   coleco_math_format_i16.asm  — AMY_I16_TO_ASCII6
;   coleco_math_format_u32.asm  — AMY_U32_TO_ASCII10
;   coleco_math_format_i32.asm  — AMY_I32_TO_ASCII11
;   coleco_math_format_fx.asm   — AMY_FX8_8_FRAC_TO_HUNDREDTHS, AMY_FX8_8_TO_ASCII6
