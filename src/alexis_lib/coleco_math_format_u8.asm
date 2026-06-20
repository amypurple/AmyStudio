; -----------------------------------------------------------------------------
; ALEXIS unsigned 8-bit formatting helpers
; Used by: coleco_math_format_fx.asm (AMY_FX8_8_TO_ASCII6)
; -----------------------------------------------------------------------------

; Convert an unsigned 8-bit value to three ASCII digits.
; Input:  A = 0..255
;         DE = destination buffer (3 bytes)
; Output: writes zero-padded decimal digits. DE after return is unspecified.
AMY_U8_TO_ASCII3:
    ld b,0
AMY_U8_TO_ASCII3_HUNDREDS:
    cp 100
    jr c,AMY_U8_TO_ASCII3_HUNDREDS_DONE
    sub 100
    inc b
    jr AMY_U8_TO_ASCII3_HUNDREDS
AMY_U8_TO_ASCII3_HUNDREDS_DONE:
    ld c,a
    ld a,b
    add a,$30
    ld (de),a
    inc de
    ld a,c
    ld b,0
AMY_U8_TO_ASCII3_TENS:
    cp 10
    jr c,AMY_U8_TO_ASCII3_TENS_DONE
    sub 10
    inc b
    jr AMY_U8_TO_ASCII3_TENS
AMY_U8_TO_ASCII3_TENS_DONE:
    ld c,a
    ld a,b
    add a,$30
    ld (de),a
    inc de
    ld a,c
    add a,$30
    ld (de),a
    ret

; Convert an unsigned 8-bit value to two ASCII digits.
; Input:  A = 0..99
;         DE = destination buffer (2 bytes)
; Output: writes zero-padded decimal digits. DE after return is unspecified.
AMY_U8_TO_ASCII2:
    ld b,0
AMY_U8_TO_ASCII2_TENS:
    cp 10
    jr c,AMY_U8_TO_ASCII2_TENS_DONE
    sub 10
    inc b
    jr AMY_U8_TO_ASCII2_TENS
AMY_U8_TO_ASCII2_TENS_DONE:
    ld c,a
    ld a,b
    add a,$30
    ld (de),a
    inc de
    ld a,c
    add a,$30
    ld (de),a
    ret
