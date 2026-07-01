; -----------------------------------------------------------------------------
; ALEXIS fp5 sqrt helpers
; Depends on: coleco_math_fp5_core.asm
;             coleco_math_fp5_div64.asm
; -----------------------------------------------------------------------------

; In-place fp5 square root.
; Input: HL = pointer to 5-byte float
; Output: value overwritten with non-negative square root
; Notes:
;   - negative inputs clamp to zero
;   - builds a 64-bit radicand from the normalized 32-bit mantissa
;   - computes integer sqrt into a 32-bit normalized mantissa
AMY_FP5_SQRT_MEM:
    push hl
    inc hl
    inc hl
    inc hl
    ld a,(hl)
    bit 7,a
    jr z,AMY_FP5_SQRT_MEM_SIGN_OK
    pop hl
    jp AMY_FP5_ZERO_MEM
AMY_FP5_SQRT_MEM_SIGN_OK:
    inc hl
    ld a,(hl)
    or a
    jr nz,AMY_FP5_SQRT_MEM_NONZERO
    pop hl
    jp AMY_FP5_ZERO_MEM
AMY_FP5_SQRT_MEM_NONZERO:
    xor a
    ld hl,AMY_FP5_SQRT_N
    ld b,32
AMY_FP5_SQRT_MEM_CLEAR_ALL:
    ld (hl),a
    inc hl
    djnz AMY_FP5_SQRT_MEM_CLEAR_ALL

    pop hl
    push hl
    push hl
    ld de,4
    add hl,de
    ld a,(hl)
    sub 129
    and 1
    ld c,a
    pop hl
    ld a,(hl)
    ld (AMY_FP5_SQRT_N+0),a
    inc hl
    ld a,(hl)
    ld (AMY_FP5_SQRT_N+1),a
    inc hl
    ld a,(hl)
    ld (AMY_FP5_SQRT_N+2),a
    inc hl
    ld a,(hl)
    and $7F
    or $80
    ld (AMY_FP5_SQRT_N+3),a

    ld a,c
    or a
    jr z,AMY_FP5_SQRT_MEM_SHIFT31
    ld b,32
    jr AMY_FP5_SQRT_MEM_SHIFT_LOOP
AMY_FP5_SQRT_MEM_SHIFT31:
    ld b,31
AMY_FP5_SQRT_MEM_SHIFT_LOOP:
    ld hl,AMY_FP5_SQRT_N
    call AMY_FP5_64_SHL1
    djnz AMY_FP5_SQRT_MEM_SHIFT_LOOP

    ld a,$40
    ld (AMY_FP5_SQRT_BIT+7),a

AMY_FP5_SQRT_MEM_ALIGN_BIT:
    ld hl,AMY_FP5_SQRT_BIT
    ld de,AMY_FP5_SQRT_N
    call AMY_FP5_64_CMP
    jr c,AMY_FP5_SQRT_MEM_LOOP
    jr z,AMY_FP5_SQRT_MEM_LOOP
    ld hl,AMY_FP5_SQRT_BIT
    call AMY_FP5_64_SHR2
    jr AMY_FP5_SQRT_MEM_ALIGN_BIT

AMY_FP5_SQRT_MEM_LOOP:
    ld hl,AMY_FP5_SQRT_BIT
    call AMY_FP5_64_IS_ZERO
    jr z,AMY_FP5_SQRT_MEM_DONE

    ld hl,AMY_FP5_SQRT_TMP
    ld de,AMY_FP5_SQRT_RES
    call AMY_FP5_64_COPY
    ld hl,AMY_FP5_SQRT_TMP
    ld de,AMY_FP5_SQRT_BIT
    call AMY_FP5_64_ADD

    ld hl,AMY_FP5_SQRT_N
    ld de,AMY_FP5_SQRT_TMP
    call AMY_FP5_64_CMP
    jr c,AMY_FP5_SQRT_MEM_NO_SUB

    ld hl,AMY_FP5_SQRT_N
    ld de,AMY_FP5_SQRT_TMP
    call AMY_FP5_64_SUB
    ld hl,AMY_FP5_SQRT_RES
    call AMY_FP5_64_SHR1
    ld hl,AMY_FP5_SQRT_RES
    ld de,AMY_FP5_SQRT_BIT
    call AMY_FP5_64_ADD
    jr AMY_FP5_SQRT_MEM_NEXT

AMY_FP5_SQRT_MEM_NO_SUB:
    ld hl,AMY_FP5_SQRT_RES
    call AMY_FP5_64_SHR1

AMY_FP5_SQRT_MEM_NEXT:
    ld hl,AMY_FP5_SQRT_BIT
    call AMY_FP5_64_SHR2
    jr AMY_FP5_SQRT_MEM_LOOP

AMY_FP5_SQRT_MEM_DONE:
    ld hl,AMY_FP5_SQRT_TMP
    ld de,AMY_FP5_SQRT_N
    call AMY_FP5_64_COPY
    ld hl,AMY_FP5_SQRT_TMP
    call AMY_FP5_64_SHL1
    ld hl,AMY_FP5_SQRT_BIT
    ld de,AMY_FP5_SQRT_RES
    call AMY_FP5_64_COPY
    ld hl,AMY_FP5_SQRT_BIT
    call AMY_FP5_64_SHL1
    ld hl,AMY_FP5_SQRT_BIT
    call AMY_FP5_64_INC
    ld hl,AMY_FP5_SQRT_TMP
    ld de,AMY_FP5_SQRT_BIT
    call AMY_FP5_64_CMP
    jr c,AMY_FP5_SQRT_MEM_DONE_PACK
    ld hl,AMY_FP5_SQRT_RES
    call AMY_FP5_64_INC
    jr AMY_FP5_SQRT_MEM_DONE_PACK_FINAL

AMY_FP5_SQRT_MEM_DONE_PACK:
    pop hl
    push hl
    ld de,4
    add hl,de
    ld a,(hl)
    sub 129
    and 1
    jr z,AMY_FP5_SQRT_MEM_DONE_PACK_FINAL
    ld hl,AMY_FP5_SQRT_TMP
    ld de,AMY_FP5_SQRT_BIT
    call AMY_FP5_64_CMP
    jr z,AMY_FP5_SQRT_MEM_DONE_PACK_FINAL
    ld hl,AMY_FP5_SQRT_RES
    call AMY_FP5_64_INC
AMY_FP5_SQRT_MEM_DONE_PACK_FINAL:
    pop hl
    push hl
    ld de,4
    add hl,de
    ld a,(hl)
    sub 129
    sra a
    add a,129
    ld b,a
    pop hl
    ld a,(AMY_FP5_SQRT_RES+0)
    ld (hl),a
    inc hl
    ld a,(AMY_FP5_SQRT_RES+1)
    ld (hl),a
    inc hl
    ld a,(AMY_FP5_SQRT_RES+2)
    ld (hl),a
    inc hl
    ld a,(AMY_FP5_SQRT_RES+3)
    and $7F
    ld (hl),a
    inc hl
    ld a,b
    ld (hl),a
    ret
