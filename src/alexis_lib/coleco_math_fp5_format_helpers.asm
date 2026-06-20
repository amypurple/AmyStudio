; -----------------------------------------------------------------------------
; ALEXIS fp5 exact-format support helpers
; -----------------------------------------------------------------------------

AMY_FP5_FMT_CLEAR32_HL:
    xor a
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    ret

AMY_FP5_FMT_CLEAR40_HL:
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
    ret

AMY_FP5_FMT_SHIFT32_LEFT_HL:
    sla (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    ret

AMY_FP5_FMT_SHIFT32_RIGHT_HL:
    inc hl
    inc hl
    inc hl
    srl (hl)
    dec hl
    rr (hl)
    dec hl
    rr (hl)
    dec hl
    rr (hl)
    ret

AMY_FP5_FMT_ADD_REM32_TO_TMP40:
    ld a,(AMY_FP5_FMT_TMP40+0)
    ld b,a
    ld a,(AMY_FP5_FMT_REM32+0)
    add a,b
    ld (AMY_FP5_FMT_TMP40+0),a
    ld a,(AMY_FP5_FMT_TMP40+1)
    ld b,a
    ld a,(AMY_FP5_FMT_REM32+1)
    adc a,b
    ld (AMY_FP5_FMT_TMP40+1),a
    ld a,(AMY_FP5_FMT_TMP40+2)
    ld b,a
    ld a,(AMY_FP5_FMT_REM32+2)
    adc a,b
    ld (AMY_FP5_FMT_TMP40+2),a
    ld a,(AMY_FP5_FMT_TMP40+3)
    ld b,a
    ld a,(AMY_FP5_FMT_REM32+3)
    adc a,b
    ld (AMY_FP5_FMT_TMP40+3),a
    ld a,(AMY_FP5_FMT_TMP40+4)
    adc a,0
    ld (AMY_FP5_FMT_TMP40+4),a
    ret

AMY_FP5_FMT_CMP_TMP40_DEN32:
    ld a,(AMY_FP5_FMT_TMP40+4)
    or a
    ret nz
    ld a,(AMY_FP5_FMT_TMP40+3)
    ld b,a
    ld a,(AMY_FP5_MANT1+3)
    cp b
    ccf
    ret nz
    ld a,(AMY_FP5_FMT_TMP40+2)
    ld b,a
    ld a,(AMY_FP5_MANT1+2)
    cp b
    ccf
    ret nz
    ld a,(AMY_FP5_FMT_TMP40+1)
    ld b,a
    ld a,(AMY_FP5_MANT1+1)
    cp b
    ccf
    ret nz
    ld a,(AMY_FP5_FMT_TMP40+0)
    ld b,a
    ld a,(AMY_FP5_MANT1+0)
    cp b
    ccf
    ret

AMY_FP5_FMT_SUB_DEN32_FROM_TMP40:
    ld a,(AMY_FP5_FMT_TMP40+0)
    ld b,a
    ld a,(AMY_FP5_MANT1+0)
    ld c,a
    ld a,b
    sub c
    ld (AMY_FP5_FMT_TMP40+0),a
    ld a,(AMY_FP5_FMT_TMP40+1)
    ld b,a
    ld a,(AMY_FP5_MANT1+1)
    ld c,a
    ld a,b
    sbc a,c
    ld (AMY_FP5_FMT_TMP40+1),a
    ld a,(AMY_FP5_FMT_TMP40+2)
    ld b,a
    ld a,(AMY_FP5_MANT1+2)
    ld c,a
    ld a,b
    sbc a,c
    ld (AMY_FP5_FMT_TMP40+2),a
    ld a,(AMY_FP5_FMT_TMP40+3)
    ld b,a
    ld a,(AMY_FP5_MANT1+3)
    ld c,a
    ld a,b
    sbc a,c
    ld (AMY_FP5_FMT_TMP40+3),a
    ld a,(AMY_FP5_FMT_TMP40+4)
    sbc a,0
    ld (AMY_FP5_FMT_TMP40+4),a
    ret

AMY_FP5_FMT_COPY_TMP40_TO_REM32:
    ld a,(AMY_FP5_FMT_TMP40+0)
    ld (AMY_FP5_FMT_REM32+0),a
    ld a,(AMY_FP5_FMT_TMP40+1)
    ld (AMY_FP5_FMT_REM32+1),a
    ld a,(AMY_FP5_FMT_TMP40+2)
    ld (AMY_FP5_FMT_REM32+2),a
    ld a,(AMY_FP5_FMT_TMP40+3)
    ld (AMY_FP5_FMT_REM32+3),a
    ret

AMY_FP5_FMT_MASK_REM32:
    ld a,c
    or a
    jr nz,AMY_FP5_FMT_MASK_REM32_NONZERO
    ld hl,AMY_FP5_FMT_REM32
    jp AMY_FP5_FMT_CLEAR32_HL
AMY_FP5_FMT_MASK_REM32_NONZERO:
    cp 8
    jr c,AMY_FP5_FMT_MASK_REM32_0
    cp 16
    jr c,AMY_FP5_FMT_MASK_REM32_1
    cp 24
    jr c,AMY_FP5_FMT_MASK_REM32_2
    cp 32
    jr c,AMY_FP5_FMT_MASK_REM32_3
    ret
AMY_FP5_FMT_MASK_REM32_0:
    ld b,a
    xor a
    ld (AMY_FP5_FMT_REM32+1),a
    ld (AMY_FP5_FMT_REM32+2),a
    ld (AMY_FP5_FMT_REM32+3),a
    ld a,1
AMY_FP5_FMT_MASK_REM32_0_LOOP:
    djnz AMY_FP5_FMT_MASK_REM32_0_SHIFT
    dec a
    ld b,a
    ld a,(AMY_FP5_FMT_REM32+0)
    and b
    ld (AMY_FP5_FMT_REM32+0),a
    ret
AMY_FP5_FMT_MASK_REM32_0_SHIFT:
    add a,a
    jr AMY_FP5_FMT_MASK_REM32_0_LOOP
AMY_FP5_FMT_MASK_REM32_1:
    sub 8
    ld b,a
    xor a
    ld (AMY_FP5_FMT_REM32+2),a
    ld (AMY_FP5_FMT_REM32+3),a
    ld a,b
    or a
    ret z
    ld a,1
AMY_FP5_FMT_MASK_REM32_1_LOOP:
    djnz AMY_FP5_FMT_MASK_REM32_1_SHIFT
    dec a
    ld b,a
    ld a,(AMY_FP5_FMT_REM32+1)
    and b
    ld (AMY_FP5_FMT_REM32+1),a
    ret
AMY_FP5_FMT_MASK_REM32_1_SHIFT:
    add a,a
    jr AMY_FP5_FMT_MASK_REM32_1_LOOP
AMY_FP5_FMT_MASK_REM32_2:
    sub 16
    ld b,a
    xor a
    ld (AMY_FP5_FMT_REM32+3),a
    ld a,b
    or a
    ret z
    ld a,1
AMY_FP5_FMT_MASK_REM32_2_LOOP:
    djnz AMY_FP5_FMT_MASK_REM32_2_SHIFT
    dec a
    ld b,a
    ld a,(AMY_FP5_FMT_REM32+2)
    and b
    ld (AMY_FP5_FMT_REM32+2),a
    ret
AMY_FP5_FMT_MASK_REM32_2_SHIFT:
    add a,a
    jr AMY_FP5_FMT_MASK_REM32_2_LOOP
AMY_FP5_FMT_MASK_REM32_3:
    sub 24
    ld b,a
    ld a,b
    or a
    ret z
    ld a,1
AMY_FP5_FMT_MASK_REM32_3_LOOP:
    djnz AMY_FP5_FMT_MASK_REM32_3_SHIFT
    dec a
    ld b,a
    ld a,(AMY_FP5_FMT_REM32+3)
    and b
    ld (AMY_FP5_FMT_REM32+3),a
    ret
AMY_FP5_FMT_MASK_REM32_3_SHIFT:
    add a,a
    jr AMY_FP5_FMT_MASK_REM32_3_LOOP

AMY_FP5_FMT_BUILD_DEN32:
    ld hl,AMY_FP5_MANT1
    call AMY_FP5_FMT_CLEAR32_HL
    ld a,1
    ld (AMY_FP5_MANT1+0),a
    ld a,c
    or a
    ret z
AMY_FP5_FMT_BUILD_DEN32_LOOP:
    ld hl,AMY_FP5_MANT1
    call AMY_FP5_FMT_SHIFT32_LEFT_HL
    dec c
    jr nz,AMY_FP5_FMT_BUILD_DEN32_LOOP
    ret
