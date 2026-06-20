; -----------------------------------------------------------------------------
; ALEXIS u32 subtract helper
; -----------------------------------------------------------------------------

; Subtract one 32-bit little-endian unsigned integer from another.
; Input: HL = destination pointer
;        DE = source pointer
; Output: destination = destination - source
AMY_U32_SUB:
    push hl
    push de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    sub b
    ld (hl),a
    inc de
    inc hl
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    sbc a,b
    ld (hl),a
    inc de
    inc hl
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    sbc a,b
    ld (hl),a
    inc de
    inc hl
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    sbc a,b
    ld (hl),a
    pop de
    pop hl
    ret
