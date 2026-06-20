; -----------------------------------------------------------------------------
; ALEXIS s32 compare helper
; -----------------------------------------------------------------------------

; Compare two 32-bit signed little-endian integers in RAM.
; Input:  HL = left pointer, DE = right pointer
; Output: flags from signed compare
AMY_CMP_S32_MEM:
    push hl
    push de
    inc hl
    inc hl
    inc hl
    inc de
    inc de
    inc de
    ld a,(hl)
    xor $80
    ld c,a
    ld a,(de)
    xor $80
    ld b,a
    ld a,c
    cp b
    jr nz,AMY_CMP_S32_MEM_DONE_MSB
    dec hl
    dec de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    cp b
    jr nz,AMY_CMP_S32_MEM_DONE_MIDHI
    dec hl
    dec de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    cp b
    jr nz,AMY_CMP_S32_MEM_DONE_MIDLO
    dec hl
    dec de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    cp b
AMY_CMP_S32_MEM_DONE_MIDLO:
AMY_CMP_S32_MEM_DONE_MIDHI:
AMY_CMP_S32_MEM_DONE_MSB:
    pop de
    pop hl
    ret
