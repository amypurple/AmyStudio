; -----------------------------------------------------------------------------
; ALEXIS fp5 transcendental helpers
; Depends on: coleco_math_fp5_core.asm
;             coleco_math_fp5_basic_arith.asm
;             coleco_math_fp5_mul.asm
; -----------------------------------------------------------------------------

; In-place fp5 natural log.
; Input: HL = pointer to 5-byte float
; Output: value overwritten with an fp5 ln approximation
; Notes:
;   - x <= 0 clamps to 0
;   - exact on powers of two via exponent decomposition
;   - mantissa core uses ln(1+t) ~= t - t^2/2 on normalized 1.0 <= m < 2.0
AMY_FP5_LOG_MEM:
    push hl
    inc hl
    inc hl
    inc hl
    ld a,(hl)
    and $80
    jp nz,AMY_FP5_LOG_MEM_ZERO
    inc hl
    ld a,(hl)
    or a
    jp z,AMY_FP5_LOG_MEM_ZERO
    pop hl
    push hl
    call AMY_FP5_LOAD_MEM_TO_FPA1
    ld a,(AMY_FP5_FPA1+4)
    sub 129
    ld (AMY_FP5_EXP_K),a
    ld a,129
    ld (AMY_FP5_FPA1+4),a

    call AMY_FP5_COPY_FPA1_TO_FPA2
    ld hl,1
    call AMY_FP5_U16_TO_FPA1
    call AMY_FP5_SUB_FPA1_FROM_FPA2

    pop hl
    push hl
    call AMY_FP5_STORE_FPA2_TO_MEM

    call AMY_FP5_COPY_FPA2_TO_FPA1
    call AMY_FP5_MUL_FPA1_FPA2
    call AMY_FP5_HALF_FPA2
    call AMY_FP5_COPY_FPA2_TO_FPA1

    pop hl
    push hl
    call AMY_FP5_LOAD_MEM_TO_FPA2
    call AMY_FP5_SUB_FPA1_FROM_FPA2

    call AMY_FP5_STORE_FPA2_TO_MEM

    ld a,(AMY_FP5_EXP_K)
    ld l,a
    add a,a
    sbc a,a
    ld h,a
    call AMY_FP5_I16_TO_FPA1
    call AMY_FP5_COPY_FPA1_TO_FPA2
    ld hl,AMY_FP5_LOG_LN2_FP5
    call AMY_FP5_LOAD_MEM_TO_FPA1
    call AMY_FP5_MUL_FPA1_FPA2
    call AMY_FP5_COPY_FPA2_TO_FPA1

    pop hl
    push hl
    call AMY_FP5_LOAD_MEM_TO_FPA2
    call AMY_FP5_ADD_FPA1_TO_FPA2
    pop hl
    jp AMY_FP5_STORE_FPA2_TO_MEM

AMY_FP5_LOG_MEM_ZERO:
    pop hl
    jp AMY_FP5_ZERO_MEM

AMY_FP5_LOG_LN2_FP5:
    db $00,$00,$72,$31,$80

; In-place fp5 exponential.
; Input: HL = pointer to 5-byte float
; Output: value overwritten with an fp5 exp approximation
; Notes:
;   - first-pass safe polynomial core: 1 + x + x^2/2
;   - exact at exp(0) = 1
;   - intentionally approximate away from zero
AMY_FP5_EXP_MEM:
    push hl
    call AMY_FP5_LOAD_MEM_TO_FPA2
    call AMY_FP5_COPY_FPA2_TO_FPA1
    call AMY_FP5_MUL_FPA1_FPA2
    call AMY_FP5_HALF_FPA2
    pop hl
    push hl
    call AMY_FP5_LOAD_MEM_TO_FPA1
    call AMY_FP5_ADD_FPA1_TO_FPA2
    ld hl,1
    call AMY_FP5_U16_TO_FPA1
    call AMY_FP5_ADD_FPA1_TO_FPA2
    pop hl
    jp AMY_FP5_STORE_FPA2_TO_MEM
