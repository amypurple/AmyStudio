; -----------------------------------------------------------------------------
; ALEXIS u32 compare helper
; Required by coleco_math_format_u32.asm (AMY_U32_TO_ASCII10)
; -----------------------------------------------------------------------------

; Compare two 32-bit unsigned little-endian integers in RAM.
; Input:  HL = left pointer, DE = right pointer
; Output: flags from left-right using the first differing byte from MSB to LSB
AMY_CMP_U32_MEM:
    push hl
    push de
    inc hl
    inc hl
    inc hl
    inc de
    inc de
    inc de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    cp b
    jr nz,AMY_CMP_U32_MEM_DONE_MSB
    dec hl
    dec de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    cp b
    jr nz,AMY_CMP_U32_MEM_DONE_MIDHI
    dec hl
    dec de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    cp b
    jr nz,AMY_CMP_U32_MEM_DONE_MIDLO
    dec hl
    dec de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    cp b
AMY_CMP_U32_MEM_DONE_MIDLO:
AMY_CMP_U32_MEM_DONE_MIDHI:
AMY_CMP_U32_MEM_DONE_MSB:
    pop de
    pop hl
    ret
