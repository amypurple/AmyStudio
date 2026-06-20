; -----------------------------------------------------------------------------
; ALEXIS u24/u32 RAM arithmetic helpers — legacy umbrella
; Symbols split into granular files: coleco_math_u32_zero/copy/inc/add/sub.asm
; Amy programs use the granular files; this file kept for backward compatibility.
; -----------------------------------------------------------------------------

; Clear a 24-bit little-endian unsigned integer in RAM.
; Input: HL = pointer to 3-byte integer
AMY_U24_ZERO:
    xor a
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    ret

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
