; -----------------------------------------------------------------------------
; ALEXIS fixed-point 16.16 divide helper
; Depends on: coleco_math_fx16_core.asm (scratch aliases, AMY_FX16_16_NEG)
;             coleco_math_u32_zero.asm  (AMY_U32_ZERO)
;             coleco_math_u32_inc.asm   (AMY_U32_INC)
;             coleco_math_compare_u32.asm (AMY_CMP_U32_MEM)
; -----------------------------------------------------------------------------

; 16.16 divide: LEFT = LEFT / RIGHT
; Input:  HL = pointer to dividend (4 bytes)
;         DE = pointer to divisor (4 bytes)
; Output: dividend overwritten with quotient
; Notes:
;   - signed 16.16 divide
;   - computes (abs(dividend) << 16) / abs(divisor)
;   - quotient keeps the low 32 bits; overflow is truncated
;   - division by zero returns 0
;   - uses AMY_BUFFER32 scratch space
AMY_FX16_16_DIV:
    push hl
    push de

    ld a,(hl)
    ld (AMY_FX16_WORK_A+0),a
    inc hl
    ld a,(hl)
    ld (AMY_FX16_WORK_A+1),a
    inc hl
    ld a,(hl)
    ld (AMY_FX16_WORK_A+2),a
    inc hl
    ld a,(hl)
    ld (AMY_FX16_WORK_A+3),a

    ld a,(de)
    ld (AMY_FX16_WORK_B+0),a
    inc de
    ld a,(de)
    ld (AMY_FX16_WORK_B+1),a
    inc de
    ld a,(de)
    ld (AMY_FX16_WORK_B+2),a
    inc de
    ld a,(de)
    ld (AMY_FX16_WORK_B+3),a

    xor a
    ld (AMY_FX16_SIGN),a

    ld a,(AMY_FX16_WORK_A+3)
    bit 7,a
    jr z,AMY_FX16_16_DIV_CHECK_RIGHT
    ld a,1
    ld (AMY_FX16_SIGN),a
    ld hl,AMY_FX16_WORK_A
    call AMY_FX16_16_NEG

AMY_FX16_16_DIV_CHECK_RIGHT:
    ld a,(AMY_FX16_WORK_B+3)
    bit 7,a
    jr z,AMY_FX16_16_DIV_CHECK_ZERO
    ld hl,AMY_FX16_SIGN
    ld a,(hl)
    xor 1
    ld (hl),a
    ld hl,AMY_FX16_WORK_B
    call AMY_FX16_16_NEG

AMY_FX16_16_DIV_CHECK_ZERO:
    ld a,(AMY_FX16_WORK_B+0)
    ld c,a
    ld a,(AMY_FX16_WORK_B+1)
    or c
    ld c,a
    ld a,(AMY_FX16_WORK_B+2)
    or c
    ld c,a
    ld a,(AMY_FX16_WORK_B+3)
    or c
    jr nz,AMY_FX16_16_DIV_PREP
    pop de
    pop hl
    jp AMY_U32_ZERO

AMY_FX16_16_DIV_PREP:
    xor a
    ld (AMY_FX16_ACC64+0),a
    ld (AMY_FX16_ACC64+1),a
    ld a,(AMY_FX16_WORK_A+0)
    ld (AMY_FX16_ACC64+2),a
    ld a,(AMY_FX16_WORK_A+1)
    ld (AMY_FX16_ACC64+3),a
    ld a,(AMY_FX16_WORK_A+2)
    ld (AMY_FX16_ACC64+4),a
    ld a,(AMY_FX16_WORK_A+3)
    ld (AMY_FX16_ACC64+5),a

    xor a
    ld (AMY_FX16_WORK_A+0),a
    ld (AMY_FX16_WORK_A+1),a
    ld (AMY_FX16_WORK_A+2),a
    ld (AMY_FX16_WORK_A+3),a

    ld (AMY_FX16_MUL64+0),a
    ld (AMY_FX16_MUL64+1),a
    ld (AMY_FX16_MUL64+2),a
    ld (AMY_FX16_MUL64+3),a
    ld (AMY_FX16_MUL64+4),a
    ld (AMY_FX16_MUL64+5),a
    ld (AMY_FX16_MUL64+6),a
    ld (AMY_FX16_MUL64+7),a

    ld b,48
AMY_FX16_16_DIV_LOOP:
    ld hl,AMY_FX16_ACC64
    sla (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)

    ld hl,AMY_FX16_MUL64
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)

    ld hl,AMY_FX16_WORK_A
    sla (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)

    ld a,(AMY_FX16_MUL64+7)
    or a
    jr nz,AMY_FX16_16_DIV_SUBTRACT
    ld a,(AMY_FX16_MUL64+6)
    or a
    jr nz,AMY_FX16_16_DIV_SUBTRACT
    ld a,(AMY_FX16_MUL64+5)
    or a
    jr nz,AMY_FX16_16_DIV_SUBTRACT
    ld a,(AMY_FX16_MUL64+4)
    or a
    jr nz,AMY_FX16_16_DIV_SUBTRACT

    ld a,(AMY_FX16_WORK_B+3)
    ld c,a
    ld a,(AMY_FX16_MUL64+3)
    cp c
    jr c,AMY_FX16_16_DIV_NEXT
    jr nz,AMY_FX16_16_DIV_SUBTRACT
    ld a,(AMY_FX16_WORK_B+2)
    ld c,a
    ld a,(AMY_FX16_MUL64+2)
    cp c
    jr c,AMY_FX16_16_DIV_NEXT
    jr nz,AMY_FX16_16_DIV_SUBTRACT
    ld a,(AMY_FX16_WORK_B+1)
    ld c,a
    ld a,(AMY_FX16_MUL64+1)
    cp c
    jr c,AMY_FX16_16_DIV_NEXT
    jr nz,AMY_FX16_16_DIV_SUBTRACT
    ld a,(AMY_FX16_WORK_B+0)
    ld c,a
    ld a,(AMY_FX16_MUL64+0)
    cp c
    jr c,AMY_FX16_16_DIV_NEXT

AMY_FX16_16_DIV_SUBTRACT:
    ld hl,AMY_FX16_MUL64
    ld a,(AMY_FX16_WORK_B+0)
    ld c,a
    ld a,(hl)
    sub c
    ld (hl),a
    inc hl
    ld a,(AMY_FX16_WORK_B+1)
    ld c,a
    ld a,(hl)
    sbc a,c
    ld (hl),a
    inc hl
    ld a,(AMY_FX16_WORK_B+2)
    ld c,a
    ld a,(hl)
    sbc a,c
    ld (hl),a
    inc hl
    ld a,(AMY_FX16_WORK_B+3)
    ld c,a
    ld a,(hl)
    sbc a,c
    ld (hl),a
    inc hl
    xor a
    ld c,a
    ld a,(hl)
    sbc a,c
    ld (hl),a
    inc hl
    ld a,(hl)
    sbc a,c
    ld (hl),a
    inc hl
    ld a,(hl)
    sbc a,c
    ld (hl),a
    inc hl
    ld a,(hl)
    sbc a,c
    ld (hl),a
    ld hl,AMY_FX16_WORK_A
    ld a,(hl)
    or 1
    ld (hl),a

AMY_FX16_16_DIV_NEXT:
    dec b
    jp nz,AMY_FX16_16_DIV_LOOP

    ; Round to nearest instead of always truncating.
    ; At loop end, the 64-bit remainder is in AMY_FX16_MUL64 and is guaranteed
    ; to be smaller than the positive 32-bit divisor in AMY_FX16_WORK_B.
    ; Round up when remainder >= ceil(divisor / 2).
    ld a,(AMY_FX16_WORK_B+0)
    and 1
    ld c,a
    ld hl,AMY_FX16_WORK_B+3
    srl (hl)
    dec hl
    rr (hl)
    dec hl
    rr (hl)
    dec hl
    rr (hl)
    ld a,c
    or a
    jr z,AMY_FX16_16_DIV_ROUND_COMPARE
    ld hl,AMY_FX16_WORK_B
    call AMY_U32_INC
AMY_FX16_16_DIV_ROUND_COMPARE:
    ld hl,AMY_FX16_MUL64
    ld de,AMY_FX16_WORK_B
    call AMY_CMP_U32_MEM
    jr c,AMY_FX16_16_DIV_STORE
    ld hl,AMY_FX16_WORK_A
    call AMY_U32_INC

AMY_FX16_16_DIV_STORE:
    pop de
    pop hl
    ld a,(AMY_FX16_WORK_A+0)
    ld (hl),a
    inc hl
    ld a,(AMY_FX16_WORK_A+1)
    ld (hl),a
    inc hl
    ld a,(AMY_FX16_WORK_A+2)
    ld (hl),a
    inc hl
    ld a,(AMY_FX16_WORK_A+3)
    ld (hl),a
    dec hl
    dec hl
    dec hl

    ld a,(AMY_FX16_SIGN)
    or a
    ret z
    jp AMY_FX16_16_NEG
