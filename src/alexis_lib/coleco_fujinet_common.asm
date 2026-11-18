; Amy FujiNet helpers shared by the ColecoVision cartridge and ADAM backends.
; None of these touch the FujiNet mailbox or an AdamNet DCB.

; Failure exit for every FujiNet wrapper: A = 1, HL = 0.
AMY_FN_FAIL:
    ld a,1
    ld hl,0
    ret

; BC = min(BC, HL). Preserves A, DE and HL.
AMY_FN_MIN_BC_HL:
    push hl
    or a
    sbc hl,bc
    pop hl
    ret nc
    ld b,h
    ld c,l
    ret

; HL = text, BC = capacity. Returns BC = bytes before the first 0, without
; trailing spaces (Amy pads string assignments with spaces). Preserves DE, HL.
AMY_FN_TEXT_LENGTH:
    push hl
    push de
    ld d,b
    ld e,c
    ld bc,0
AMY_FN_TEXT_LENGTH_SCAN:
    ld a,d
    or e
    jr z,AMY_FN_TEXT_LENGTH_TRIM
    ld a,(hl)
    or a
    jr z,AMY_FN_TEXT_LENGTH_TRIM
    inc hl
    inc bc
    dec de
    jr AMY_FN_TEXT_LENGTH_SCAN
AMY_FN_TEXT_LENGTH_TRIM:
    ld a,b
    or c
    jr z,AMY_FN_TEXT_LENGTH_DONE
    dec hl
    ld a,(hl)
    cp $20
    jr nz,AMY_FN_TEXT_LENGTH_DONE
    dec bc
    jr AMY_FN_TEXT_LENGTH_TRIM
AMY_FN_TEXT_LENGTH_DONE:
    pop de
    pop hl
    ret

; HL = source, DE = destination, BC = limit. Copies until a 0 byte or the
; limit. Returns HL = bytes copied.
AMY_FN_COPY_STRING:
    push de
AMY_FN_COPY_STRING_LOOP:
    ld a,b
    or c
    jr z,AMY_FN_COPY_STRING_END
    ld a,(hl)
    or a
    jr z,AMY_FN_COPY_STRING_END
    ld (de),a
    inc hl
    inc de
    dec bc
    jr AMY_FN_COPY_STRING_LOOP
AMY_FN_COPY_STRING_END:
    ex de,hl
    pop de
    or a
    sbc hl,de
    ret

; HL = buffer, BC = bytes used, DE = capacity. Drops trailing CR and LF,
; then stores a 0 after the text when the buffer has room.
; Returns HL = bytes kept.
AMY_FN_FINISH_TEXT:
    push hl
AMY_FN_FINISH_TEXT_TRIM:
    ld a,b
    or c
    jr z,AMY_FN_FINISH_TEXT_TERM
    pop hl
    push hl
    add hl,bc
    dec hl
    ld a,(hl)
    cp $0A
    jr z,AMY_FN_FINISH_TEXT_DROP
    cp $0D
    jr nz,AMY_FN_FINISH_TEXT_TERM
AMY_FN_FINISH_TEXT_DROP:
    dec bc
    jr AMY_FN_FINISH_TEXT_TRIM
AMY_FN_FINISH_TEXT_TERM:
    pop hl
    push hl
    add hl,bc
    ex de,hl
    or a
    sbc hl,bc
    jr z,AMY_FN_FINISH_TEXT_DONE
    xor a
    ld (de),a
AMY_FN_FINISH_TEXT_DONE:
    pop hl
    ld h,b
    ld l,c
    ret
