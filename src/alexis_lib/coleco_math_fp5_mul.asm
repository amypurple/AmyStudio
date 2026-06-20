; -----------------------------------------------------------------------------
; ALEXIS fp5 multiply helpers
; Depends on: coleco_math_fp5_core.asm
;             coleco_math_fp5_div64.asm
; -----------------------------------------------------------------------------

AMY_FP5_CLEAR_RES64:
    xor a
    ld (AMY_FP5_FPA1+0),a
    ld (AMY_FP5_FPA1+1),a
    ld (AMY_FP5_FPA1+2),a
    ld (AMY_FP5_FPA1+3),a
    ld (AMY_FP5_FPA1+4),a
    ld (AMY_FP5_FPA2+0),a
    ld (AMY_FP5_FPA2+1),a
    ld (AMY_FP5_FPA2+2),a
    ret

AMY_FP5_ADD_TEMP32_TO_RES2:
    ld hl,AMY_FP5_FPA1+2
    ld a,(AMY_FP5_MUL64+0)
    add a,(hl)
    ld (hl),a
    inc hl
    ld a,(AMY_FP5_MUL64+1)
    adc a,(hl)
    ld (hl),a
    inc hl
    ld a,(AMY_FP5_MUL64+2)
    adc a,(hl)
    ld (hl),a
    inc hl
    ld a,(AMY_FP5_MUL64+3)
    adc a,(hl)
    ld (hl),a
    inc hl
    ld a,0
    adc a,(hl)
    ld (hl),a
    inc hl
    ld a,0
    adc a,(hl)
    ld (hl),a
    ret

AMY_FP5_ADD_TEMP32_TO_RES4:
    ld hl,AMY_FP5_FPA1+4
    ld a,(AMY_FP5_MUL64+0)
    add a,(hl)
    ld (hl),a
    inc hl
    ld a,(AMY_FP5_MUL64+1)
    adc a,(hl)
    ld (hl),a
    inc hl
    ld a,(AMY_FP5_MUL64+2)
    adc a,(hl)
    ld (hl),a
    inc hl
    ld a,(AMY_FP5_MUL64+3)
    adc a,(hl)
    ld (hl),a
    ret

AMY_FP5_SHR_RES64_1:
    ld a,(AMY_FP5_FPA2+2)
    srl a
    ld (AMY_FP5_FPA2+2),a
    ld a,(AMY_FP5_FPA2+1)
    rr a
    ld (AMY_FP5_FPA2+1),a
    ld a,(AMY_FP5_FPA2+0)
    rr a
    ld (AMY_FP5_FPA2+0),a
    ld a,(AMY_FP5_FPA1+4)
    rr a
    ld (AMY_FP5_FPA1+4),a
    ld a,(AMY_FP5_FPA1+3)
    rr a
    ld (AMY_FP5_FPA1+3),a
    ld a,(AMY_FP5_FPA1+2)
    rr a
    ld (AMY_FP5_FPA1+2),a
    ld a,(AMY_FP5_FPA1+1)
    rr a
    ld (AMY_FP5_FPA1+1),a
    ld a,(AMY_FP5_FPA1+0)
    rr a
    ld (AMY_FP5_FPA1+0),a
    ret

AMY_FP5_MUL_SHR_B32_1:
    ld hl,AMY_FP5_MUL_B32+3
    srl (hl)
    dec hl
    rr (hl)
    dec hl
    rr (hl)
    dec hl
    rr (hl)
    ret

; Core: FPA2 = FPA2 * FPA1
; Notes:
;   - true fp5 multiply, no fixed32 bridge
;   - 32-bit mantissas with restored implicit top bit
;   - exponent bias = 129
AMY_FP5_MUL_FPA1_FPA2:
    ld a,(AMY_FP5_FPA1+4)
    or a
    jp z,AMY_FP5_MUL_FPA1_FPA2_ZERO
    ld a,(AMY_FP5_FPA2+4)
    or a
    jp z,AMY_FP5_MUL_FPA1_FPA2_ZERO

    ld a,(AMY_FP5_FPA1+0)
    ld (AMY_FP5_MUL_OP1+0),a
    ld a,(AMY_FP5_FPA1+1)
    ld (AMY_FP5_MUL_OP1+1),a
    ld a,(AMY_FP5_FPA1+2)
    ld (AMY_FP5_MUL_OP1+2),a
    ld a,(AMY_FP5_FPA1+3)
    and $7F
    or $80
    ld (AMY_FP5_MUL_OP1+3),a

    ld a,(AMY_FP5_FPA2+0)
    ld (AMY_FP5_MUL_OP2+0),a
    ld a,(AMY_FP5_FPA2+1)
    ld (AMY_FP5_MUL_OP2+1),a
    ld a,(AMY_FP5_FPA2+2)
    ld (AMY_FP5_MUL_OP2+2),a
    ld a,(AMY_FP5_FPA2+3)
    and $7F
    or $80
    ld (AMY_FP5_MUL_OP2+3),a

    ld a,(AMY_FP5_FPA1+3)
    ld b,a
    ld a,(AMY_FP5_FPA2+3)
    xor b
    and $80
    ld (AMY_FP5_MUL_SIGN),a

    ld a,(AMY_FP5_FPA1+4)
    ld b,a
    ld a,(AMY_FP5_FPA2+4)
    add a,b
    sub 129
    ld (AMY_FP5_MUL_EXP),a

    call AMY_FP5_CLEAR_RES64

    ld a,(AMY_FP5_MUL_OP1+0)
    ld (AMY_FP5_MUL_A64+0),a
    ld a,(AMY_FP5_MUL_OP1+1)
    ld (AMY_FP5_MUL_A64+1),a
    ld a,(AMY_FP5_MUL_OP1+2)
    ld (AMY_FP5_MUL_A64+2),a
    ld a,(AMY_FP5_MUL_OP1+3)
    ld (AMY_FP5_MUL_A64+3),a
    xor a
    ld (AMY_FP5_MUL_A64+4),a
    ld (AMY_FP5_MUL_A64+5),a
    ld (AMY_FP5_MUL_A64+6),a
    ld (AMY_FP5_MUL_A64+7),a

    ld a,(AMY_FP5_MUL_OP2+0)
    ld (AMY_FP5_MUL_B32+0),a
    ld a,(AMY_FP5_MUL_OP2+1)
    ld (AMY_FP5_MUL_B32+1),a
    ld a,(AMY_FP5_MUL_OP2+2)
    ld (AMY_FP5_MUL_B32+2),a
    ld a,(AMY_FP5_MUL_OP2+3)
    ld (AMY_FP5_MUL_B32+3),a

    ld b,32
AMY_FP5_MUL_FPA1_FPA2_BUILD_LOOP:
    ld a,(AMY_FP5_MUL_B32+0)
    and 1
    jr z,AMY_FP5_MUL_FPA1_FPA2_BUILD_SKIP_ADD
    ld hl,AMY_FP5_FPA1
    ld de,AMY_FP5_MUL_A64
    call AMY_FP5_64_ADD
AMY_FP5_MUL_FPA1_FPA2_BUILD_SKIP_ADD:
    ld hl,AMY_FP5_MUL_A64
    call AMY_FP5_64_SHL1
    call AMY_FP5_MUL_SHR_B32_1
    djnz AMY_FP5_MUL_FPA1_FPA2_BUILD_LOOP

    ld a,(AMY_FP5_FPA2+2)
    bit 7,a
    jr z,AMY_FP5_MUL_FPA1_FPA2_SHIFT31

    ; Round-to-nearest-even before the final normalization shift.
    ld a,(AMY_FP5_FPA1+3)
    and $80
    jr z,AMY_FP5_MUL_FPA1_FPA2_SHIFT32_PREP
    ld a,(AMY_FP5_FPA1+0)
    ld b,a
    ld a,(AMY_FP5_FPA1+1)
    or b
    ld b,a
    ld a,(AMY_FP5_FPA1+2)
    or b
    ld b,a
    ld a,(AMY_FP5_FPA1+3)
    and $7F
    or b
    jr nz,AMY_FP5_MUL_FPA1_FPA2_SHIFT32_ROUND
    ld a,(AMY_FP5_FPA1+4)
    and 1
    jr z,AMY_FP5_MUL_FPA1_FPA2_SHIFT32_PREP
AMY_FP5_MUL_FPA1_FPA2_SHIFT32_ROUND:
    ld hl,AMY_FP5_FPA1+3
    ld a,$80
    add a,(hl)
    ld (hl),a
    inc hl
    ld a,0
    adc a,(hl)
    ld (hl),a
    inc hl
    ld a,0
    adc a,(hl)
    ld (hl),a
    inc hl
    ld a,0
    adc a,(hl)
    ld (hl),a
    inc hl
    ld a,0
    adc a,(hl)
    ld (hl),a
    jr nc,AMY_FP5_MUL_FPA1_FPA2_SHIFT32_PREP
    ld hl,AMY_FP5_FPA1+0
    xor a
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld a,1
    ld (hl),a
    ld hl,AMY_FP5_MUL_EXP
    inc (hl)
AMY_FP5_MUL_FPA1_FPA2_SHIFT32_PREP:
    ld b,32
AMY_FP5_MUL_FPA1_FPA2_SHIFT32_LOOP:
    call AMY_FP5_SHR_RES64_1
    djnz AMY_FP5_MUL_FPA1_FPA2_SHIFT32_LOOP
    ld hl,AMY_FP5_MUL_EXP
    inc (hl)
    jr AMY_FP5_MUL_FPA1_FPA2_PACK

AMY_FP5_MUL_FPA1_FPA2_SHIFT31:
    ld a,(AMY_FP5_FPA1+3)
    and $40
    jr z,AMY_FP5_MUL_FPA1_FPA2_SHIFT31_SKIP_ROUND
    ld a,(AMY_FP5_FPA1+0)
    ld b,a
    ld a,(AMY_FP5_FPA1+1)
    or b
    ld b,a
    ld a,(AMY_FP5_FPA1+2)
    or b
    ld b,a
    ld a,(AMY_FP5_FPA1+3)
    and $3F
    or b
    jr nz,AMY_FP5_MUL_FPA1_FPA2_SHIFT31_ROUND
    ld a,(AMY_FP5_FPA1+3)
    and $80
    jr z,AMY_FP5_MUL_FPA1_FPA2_SHIFT31_SKIP_ROUND
AMY_FP5_MUL_FPA1_FPA2_SHIFT31_ROUND:
    ld hl,AMY_FP5_FPA1+3
    ld a,$40
    add a,(hl)
    ld (hl),a
    inc hl
    ld a,0
    adc a,(hl)
    ld (hl),a
    inc hl
    ld a,0
    adc a,(hl)
    ld (hl),a
    inc hl
    ld a,0
    adc a,(hl)
    ld (hl),a
    inc hl
    ld a,0
    adc a,(hl)
    ld (hl),a
    jr c,AMY_FP5_MUL_FPA1_FPA2_SHIFT31_ROUNDED_TO_32
AMY_FP5_MUL_FPA1_FPA2_SHIFT31_SKIP_ROUND:
    ld b,31
AMY_FP5_MUL_FPA1_FPA2_SHIFT31_LOOP:
    call AMY_FP5_SHR_RES64_1
    djnz AMY_FP5_MUL_FPA1_FPA2_SHIFT31_LOOP
    jr AMY_FP5_MUL_FPA1_FPA2_PACK

AMY_FP5_MUL_FPA1_FPA2_SHIFT31_ROUNDED_TO_32:
    ld b,32
AMY_FP5_MUL_FPA1_FPA2_SHIFT31_TO_32_LOOP:
    call AMY_FP5_SHR_RES64_1
    djnz AMY_FP5_MUL_FPA1_FPA2_SHIFT31_TO_32_LOOP
    ld hl,AMY_FP5_MUL_EXP
    inc (hl)

AMY_FP5_MUL_FPA1_FPA2_PACK:
    ld a,(AMY_FP5_FPA1+0)
    ld (AMY_FP5_FPA2+0),a
    ld a,(AMY_FP5_FPA1+1)
    ld (AMY_FP5_FPA2+1),a
    ld a,(AMY_FP5_FPA1+2)
    ld (AMY_FP5_FPA2+2),a
    ld a,(AMY_FP5_FPA1+3)
    and $7F
    ld b,a
    ld a,(AMY_FP5_MUL_SIGN)
    or b
    ld (AMY_FP5_FPA2+3),a
    ld a,(AMY_FP5_MUL_EXP)
    ld (AMY_FP5_FPA2+4),a
    ret

AMY_FP5_MUL_FPA1_FPA2_ZERO:
    ld hl,AMY_FP5_FPA2
    jp AMY_FP5_ZERO_MEM
