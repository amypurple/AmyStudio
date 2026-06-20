; -----------------------------------------------------------------------------
; ALEXIS name-table byte-copy helper
; Copies B bytes from HL to the name table at screen position D=y, E=x.
; -----------------------------------------------------------------------------

; Copy B bytes from HL to the name table at D=y, E=x.
AMY_PUT_AT:
    ld a,b
    or a
    ret z
    push hl
    call AMY_TEXT_CALC_NAME_ADDRESS
    ld a,l
    out (VDP_CTRL_PORT),a
    ld a,h
    or $40
    out (VDP_CTRL_PORT),a
    pop hl
AMY_PUT_AT_LOOP:
    ld a,(hl)
    out (VDP_DATA_PORT),a
    inc hl
    djnz AMY_PUT_AT_LOOP
    ret
