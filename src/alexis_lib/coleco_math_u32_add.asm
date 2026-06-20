; -----------------------------------------------------------------------------
; ALEXIS u32 add helper
; -----------------------------------------------------------------------------

; Add one 32-bit little-endian unsigned integer to another.
; Input: HL = destination pointer
;        DE = source pointer
; Output: destination = destination + source
AMY_U32_ADD:
    push hl
    push de
    ld a,(de)
    add a,(hl)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    adc a,(hl)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    adc a,(hl)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    adc a,(hl)
    ld (hl),a
    pop de
    pop hl
    ret
