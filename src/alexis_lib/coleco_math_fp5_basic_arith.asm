; -----------------------------------------------------------------------------
; ALEXIS fp5 basic arithmetic helpers
; Compare/add/sub plus shared mantissa helpers for cheap fp5 math.
; -----------------------------------------------------------------------------

; Compare FPA1 against FPA2 as signed fp5 values.
; Output flags behave like a compare:
;   Z = 1 when FPA1 == FPA2
;   C = 1 when FPA1 < FPA2
;   C = 0, Z = 0 when FPA1 > FPA2
AMY_FP5_CMP_FPA1_FPA2:
    ld a,(AMY_FP5_FPA1+4)
    or a
    jp nz,AMY_FP5_CMP_FPA1_FPA2_LEFT_NONZERO
    ld a,(AMY_FP5_FPA2+4)
    or a
    jp z,AMY_FP5_CMP_FPA1_FPA2_EQUAL
    ld a,(AMY_FP5_FPA2+3)
    and $80
    jp nz,AMY_FP5_CMP_FPA1_FPA2_GREATER
    jp AMY_FP5_CMP_FPA1_FPA2_LESS

AMY_FP5_CMP_FPA1_FPA2_LEFT_NONZERO:
    ld a,(AMY_FP5_FPA2+4)
    or a
    jp nz,AMY_FP5_CMP_FPA1_FPA2_BOTH_NONZERO
    ld a,(AMY_FP5_FPA1+3)
    and $80
    jp nz,AMY_FP5_CMP_FPA1_FPA2_LESS
    jp AMY_FP5_CMP_FPA1_FPA2_GREATER

AMY_FP5_CMP_FPA1_FPA2_BOTH_NONZERO:
    ld a,(AMY_FP5_FPA1+3)
    and $80
    ld c,a
    ld a,(AMY_FP5_FPA2+3)
    and $80
    ld b,a
    ld a,c
    cp b
    jp z,AMY_FP5_CMP_FPA1_FPA2_SAME_SIGN
    jp nz,AMY_FP5_CMP_FPA1_FPA2_DIFFERENT_SIGNS

AMY_FP5_CMP_FPA1_FPA2_SAME_SIGN:
    ld a,c
    or a
    jp nz,AMY_FP5_CMP_FPA1_FPA2_SAME_SIGN_NEG
AMY_FP5_CMP_FPA1_FPA2_SAME_SIGN_POS:
    ld a,(AMY_FP5_FPA1+4)
    ld b,a
    ld a,(AMY_FP5_FPA2+4)
    ld d,a
    ld a,b
    cp d
    ret nz
    ld a,(AMY_FP5_FPA1+3)
    and $7F
    ld e,a
    ld a,(AMY_FP5_FPA2+3)
    and $7F
    ld b,a
    ld a,e
    cp b
    ret nz
    ld a,(AMY_FP5_FPA2+2)
    ld b,a
    ld a,(AMY_FP5_FPA1+2)
    cp b
    ret nz
    ld a,(AMY_FP5_FPA2+1)
    ld b,a
    ld a,(AMY_FP5_FPA1+1)
    cp b
    ret nz
    ld a,(AMY_FP5_FPA2+0)
    ld b,a
    ld a,(AMY_FP5_FPA1+0)
    cp b
    jp z,AMY_FP5_CMP_FPA1_FPA2_EQUAL
    ret

AMY_FP5_CMP_FPA1_FPA2_SAME_SIGN_NEG:
    ld a,(AMY_FP5_FPA1+4)
    ld b,a
    ld a,(AMY_FP5_FPA2+4)
    ld d,a
    ld a,b
    cp d
    jp nz,AMY_FP5_CMP_FPA1_FPA2_INVERT
    ld a,(AMY_FP5_FPA1+3)
    and $7F
    ld e,a
    ld a,(AMY_FP5_FPA2+3)
    and $7F
    ld b,a
    ld a,e
    cp b
    jp nz,AMY_FP5_CMP_FPA1_FPA2_INVERT
    ld a,(AMY_FP5_FPA2+2)
    ld b,a
    ld a,(AMY_FP5_FPA1+2)
    cp b
    jp nz,AMY_FP5_CMP_FPA1_FPA2_INVERT
    ld a,(AMY_FP5_FPA2+1)
    ld b,a
    ld a,(AMY_FP5_FPA1+1)
    cp b
    jp nz,AMY_FP5_CMP_FPA1_FPA2_INVERT
    ld a,(AMY_FP5_FPA2+0)
    ld b,a
    ld a,(AMY_FP5_FPA1+0)
    cp b
    jp z,AMY_FP5_CMP_FPA1_FPA2_EQUAL
    jp AMY_FP5_CMP_FPA1_FPA2_INVERT

AMY_FP5_CMP_FPA1_FPA2_DIFFERENT_SIGNS:
    ld a,c
    or a
    jp nz,AMY_FP5_CMP_FPA1_FPA2_LESS
    jp AMY_FP5_CMP_FPA1_FPA2_GREATER

AMY_FP5_CMP_FPA1_FPA2_INVERT:
    jp c,AMY_FP5_CMP_FPA1_FPA2_GREATER
    jp AMY_FP5_CMP_FPA1_FPA2_LESS

AMY_FP5_CMP_FPA1_FPA2_EQUAL:
    xor a
    ret

AMY_FP5_CMP_FPA1_FPA2_LESS:
    ld a,0
    cp 1
    ret

AMY_FP5_CMP_FPA1_FPA2_GREATER:
    ld a,1
    cp 0
    ret

; Core: FPA2 = FPA2 + FPA1
AMY_FP5_ADD_FPA1_TO_FPA2:
    ld a,(AMY_FP5_FPA1+4)
    or a
    ret z
    ld a,(AMY_FP5_FPA2+4)
    or a
    jr nz,AMY_FP5_ADD_FPA1_TO_FPA2_BOTH
    jp AMY_FP5_COPY_FPA1_TO_FPA2

AMY_FP5_ADD_FPA1_TO_FPA2_BOTH:
    ld a,(AMY_FP5_FPA2+0)
    ld (AMY_FP5_MANT1+0),a
    ld a,(AMY_FP5_FPA2+1)
    ld (AMY_FP5_MANT1+1),a
    ld a,(AMY_FP5_FPA2+2)
    ld (AMY_FP5_MANT1+2),a
    ld a,(AMY_FP5_FPA2+3)
    ld b,a
    and $7F
    or $80
    ld (AMY_FP5_MANT1+3),a
    ld a,(AMY_FP5_FPA2+4)
    ld (AMY_FP5_META+0),a
    bit 7,b
    jr z,AMY_FP5_ADD_FPA1_TO_FPA2_SIGN1_POS
    ld a,1
    ld (AMY_FP5_META+1),a
    jr AMY_FP5_ADD_FPA1_TO_FPA2_LOAD2
AMY_FP5_ADD_FPA1_TO_FPA2_SIGN1_POS:
    xor a
    ld (AMY_FP5_META+1),a

AMY_FP5_ADD_FPA1_TO_FPA2_LOAD2:
    ld a,(AMY_FP5_FPA1+0)
    ld (AMY_FP5_MANT2+0),a
    ld a,(AMY_FP5_FPA1+1)
    ld (AMY_FP5_MANT2+1),a
    ld a,(AMY_FP5_FPA1+2)
    ld (AMY_FP5_MANT2+2),a
    ld a,(AMY_FP5_FPA1+3)
    ld b,a
    and $7F
    or $80
    ld (AMY_FP5_MANT2+3),a
    ld a,(AMY_FP5_FPA1+4)
    ld (AMY_FP5_META+2),a
    bit 7,b
    jr z,AMY_FP5_ADD_FPA1_TO_FPA2_SIGN2_POS
    ld a,1
    ld (AMY_FP5_META+3),a
    jr AMY_FP5_ADD_FPA1_TO_FPA2_ALIGN
AMY_FP5_ADD_FPA1_TO_FPA2_SIGN2_POS:
    xor a
    ld (AMY_FP5_META+3),a

AMY_FP5_ADD_FPA1_TO_FPA2_ALIGN:
    ld a,(AMY_FP5_META+0)
    ld b,a
    ld a,(AMY_FP5_META+2)
    cp b
    jr c,AMY_FP5_ADD_FPA1_TO_FPA2_SHIFT2
    jr z,AMY_FP5_ADD_FPA1_TO_FPA2_EQUAL_EXP
    sub b
    cp 32
    jr c,AMY_FP5_ADD_FPA1_TO_FPA2_SHIFT1_LOOP_PREP
    call AMY_FP5_CLEAR_MANT1
    jr AMY_FP5_ADD_FPA1_TO_FPA2_USE_EXP2
AMY_FP5_ADD_FPA1_TO_FPA2_SHIFT1_LOOP_PREP:
    ld c,a
AMY_FP5_ADD_FPA1_TO_FPA2_SHIFT1_LOOP:
    call AMY_FP5_SHIFT_MANT1_RIGHT
    dec c
    jr nz,AMY_FP5_ADD_FPA1_TO_FPA2_SHIFT1_LOOP
AMY_FP5_ADD_FPA1_TO_FPA2_USE_EXP2:
    ld a,(AMY_FP5_META+2)
    ld (AMY_FP5_META+4),a
    jr AMY_FP5_ADD_FPA1_TO_FPA2_SIGNS

AMY_FP5_ADD_FPA1_TO_FPA2_EQUAL_EXP:
    ld a,(AMY_FP5_META+0)
    ld (AMY_FP5_META+4),a
    jr AMY_FP5_ADD_FPA1_TO_FPA2_SIGNS

AMY_FP5_ADD_FPA1_TO_FPA2_SHIFT2:
    ld a,b
    ld c,a
    ld a,(AMY_FP5_META+2)
    ld b,a
    ld a,c
    sub b
    cp 32
    jr c,AMY_FP5_ADD_FPA1_TO_FPA2_SHIFT2_LOOP_PREP
    call AMY_FP5_CLEAR_MANT2
    ld a,(AMY_FP5_META+0)
    ld (AMY_FP5_META+4),a
    jr AMY_FP5_ADD_FPA1_TO_FPA2_SIGNS
AMY_FP5_ADD_FPA1_TO_FPA2_SHIFT2_LOOP_PREP:
    ld c,a
AMY_FP5_ADD_FPA1_TO_FPA2_SHIFT2_LOOP:
    call AMY_FP5_SHIFT_MANT2_RIGHT
    dec c
    jr nz,AMY_FP5_ADD_FPA1_TO_FPA2_SHIFT2_LOOP
    ld a,(AMY_FP5_META+0)
    ld (AMY_FP5_META+4),a

AMY_FP5_ADD_FPA1_TO_FPA2_SIGNS:
    ld a,(AMY_FP5_META+1)
    ld b,a
    ld a,(AMY_FP5_META+3)
    cp b
    jr nz,AMY_FP5_ADD_FPA1_TO_FPA2_DIFFERENT_SIGNS
    call AMY_FP5_ADD_MANT2_TO_MANT1
    jr nc,AMY_FP5_ADD_FPA1_TO_FPA2_PACK
    call AMY_FP5_SHIFT_MANT1_RIGHT
    ld hl,AMY_FP5_META+4
    inc (hl)
    jr AMY_FP5_ADD_FPA1_TO_FPA2_PACK

AMY_FP5_ADD_FPA1_TO_FPA2_DIFFERENT_SIGNS:
    call AMY_FP5_CMP_MANT1_MANT2
    jr z,AMY_FP5_ADD_FPA1_TO_FPA2_ZERO
    jr nc,AMY_FP5_ADD_FPA1_TO_FPA2_SUB12
    call AMY_FP5_SUB_MANT1_FROM_MANT2
    call AMY_FP5_COPY_MANT2_TO_MANT1
    ld a,(AMY_FP5_META+3)
    ld (AMY_FP5_META+1),a
    jr AMY_FP5_ADD_FPA1_TO_FPA2_NORMALIZE
AMY_FP5_ADD_FPA1_TO_FPA2_SUB12:
    call AMY_FP5_SUB_MANT2_FROM_MANT1
AMY_FP5_ADD_FPA1_TO_FPA2_NORMALIZE:
    call AMY_FP5_MANT1_IS_ZERO
    jr z,AMY_FP5_ADD_FPA1_TO_FPA2_ZERO
    ld a,(AMY_FP5_MANT1+3)
    bit 7,a
    jr nz,AMY_FP5_ADD_FPA1_TO_FPA2_PACK
    ld hl,AMY_FP5_META+4
    dec (hl)
    jr z,AMY_FP5_ADD_FPA1_TO_FPA2_ZERO
    call AMY_FP5_SHIFT_MANT1_LEFT
    jr AMY_FP5_ADD_FPA1_TO_FPA2_NORMALIZE

AMY_FP5_ADD_FPA1_TO_FPA2_PACK:
    ld a,(AMY_FP5_MANT1+0)
    ld (AMY_FP5_FPA2+0),a
    ld a,(AMY_FP5_MANT1+1)
    ld (AMY_FP5_FPA2+1),a
    ld a,(AMY_FP5_MANT1+2)
    ld (AMY_FP5_FPA2+2),a
    ld a,(AMY_FP5_MANT1+3)
    and $7F
    ld b,a
    ld a,(AMY_FP5_META+1)
    or a
    ld a,b
    jr z,AMY_FP5_ADD_FPA1_TO_FPA2_PACK_POS
    or $80
AMY_FP5_ADD_FPA1_TO_FPA2_PACK_POS:
    ld (AMY_FP5_FPA2+3),a
    ld a,(AMY_FP5_META+4)
    ld (AMY_FP5_FPA2+4),a
    ret

AMY_FP5_ADD_FPA1_TO_FPA2_ZERO:
    ld hl,AMY_FP5_FPA2
    jp AMY_FP5_ZERO_MEM

; Core: FPA2 = FPA2 - FPA1
AMY_FP5_SUB_FPA1_FROM_FPA2:
    ld a,(AMY_FP5_FPA1+4)
    or a
    ret z
    ld a,(AMY_FP5_FPA1+3)
    xor $80
    ld (AMY_FP5_FPA1+3),a
    call AMY_FP5_ADD_FPA1_TO_FPA2
    ld a,(AMY_FP5_FPA1+3)
    xor $80
    ld (AMY_FP5_FPA1+3),a
    ret

