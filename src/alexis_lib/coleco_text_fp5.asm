; -----------------------------------------------------------------------------
; ALEXIS fp5 text print helper
; Depends on AMY_FP5_TO_ASCII16, AMY_PUT_AT, AMY_FP5_TEXT_BUFFER.
; -----------------------------------------------------------------------------

; Print a 5-byte fp5 value at D=y, E=x using exact 16-char formatting.
; Input: HL = source fp5 pointer, D = y, E = x.
AMY_PRINT_FP5_AT:
    push de
    ld de,AMY_FP5_TEXT_BUFFER
    call AMY_FP5_TO_ASCII16
    pop de
    ld hl,AMY_FP5_TEXT_BUFFER
    ld b,16
    jp AMY_PUT_AT
