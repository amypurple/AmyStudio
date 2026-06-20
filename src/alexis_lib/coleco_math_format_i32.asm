; -----------------------------------------------------------------------------
; ALEXIS i32 formatting helper
; Depends on: coleco_math_format_u32.asm (AMY_U32_TO_ASCII10)
;             coleco_math_u32_copy.asm (AMY_U32_COPY)
;             coleco_math_u32_inc.asm  (AMY_U32_INC)
; -----------------------------------------------------------------------------

; Format a signed 32-bit little-endian value as " sdddddddddd".
; Input:  HL = pointer to 4-byte signed source value
;         DE = destination buffer (11 bytes)
; Output: writes exactly 11 ASCII chars ([space|'-'] + 10 digits)
; Scratch: uses AMY_BUFFER32..AMY_BUFFER32+3 as a working copy
AMY_I32_TO_ASCII11:
    push hl
    push de
    inc hl
    inc hl
    inc hl
    ld a,(hl)
    pop de
    pop hl
    bit 7,a
    jr nz,AMY_I32_TO_ASCII11_NEGATIVE
    ld a,$20
    ld (de),a
    inc de
    jp AMY_U32_TO_ASCII10
AMY_I32_TO_ASCII11_NEGATIVE:
    ld a,$2D
    ld (de),a
    inc de
    push de
    ex de,hl
    ld hl,AMY_BUFFER32
    call AMY_U32_COPY
    pop de
    ld hl,AMY_BUFFER32
    ld a,(hl)
    cpl
    ld (hl),a
    inc hl
    ld a,(hl)
    cpl
    ld (hl),a
    inc hl
    ld a,(hl)
    cpl
    ld (hl),a
    inc hl
    ld a,(hl)
    cpl
    ld (hl),a
    ld hl,AMY_BUFFER32
    call AMY_U32_INC
    ld hl,AMY_BUFFER32
    jp AMY_U32_TO_ASCII10
