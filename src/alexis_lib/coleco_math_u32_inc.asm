; -----------------------------------------------------------------------------
; ALEXIS u32 increment helper
; -----------------------------------------------------------------------------

; Increment a 32-bit little-endian unsigned integer in RAM.
; Input: HL = pointer to integer
AMY_U32_INC:
    inc (hl)
    ret nz
    inc hl
    inc (hl)
    ret nz
    inc hl
    inc (hl)
    ret nz
    inc hl
    inc (hl)
    ret
