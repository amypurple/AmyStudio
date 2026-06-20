; -----------------------------------------------------------------------------
; ALEXIS u32 zero helper
; -----------------------------------------------------------------------------

; Clear a 32-bit little-endian unsigned integer in RAM.
; Input: HL = pointer to 4-byte integer
AMY_U32_ZERO:
    xor a
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    ret
