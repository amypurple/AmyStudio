; -----------------------------------------------------------------------------
; ALEXIS u32 copy helper
; -----------------------------------------------------------------------------

; Copy a 32-bit little-endian unsigned integer.
; Input: HL = destination pointer, DE = source pointer
AMY_U32_COPY:
    ld a,(de)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    ld (hl),a
    ret
