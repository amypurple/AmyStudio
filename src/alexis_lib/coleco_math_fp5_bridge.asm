; -----------------------------------------------------------------------------
; ALEXIS fp5 <-> fixed32 bridge helpers
; -----------------------------------------------------------------------------

; Convert 5-byte float at HL into signed 16.16 at DE.
; Input: HL = source pointer
;        DE = destination pointer (4 bytes)
AMY_FP5_TO_FX16_16:
    push de
    push hl
    inc hl
    inc hl
    inc hl
    inc hl
    ld a,(hl)
    or a
    jr nz,AMY_FP5_TO_FX16_16_NONZERO
    pop hl
    pop hl
    xor a
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    ret

AMY_FP5_TO_FX16_16_NONZERO:
    ld c,a
    pop hl
    pop de
    push de

    ld a,(hl)
    ld (de),a
    inc hl
    inc de
    ld a,(hl)
    ld (de),a
    inc hl
    inc de
    ld a,(hl)
    ld (de),a
    inc hl
    inc de
    ld a,(hl)
    ld b,a
    and $7F
    or $80
    ld (de),a
    pop de

    bit 7,b
    jr z,AMY_FP5_TO_FX16_16_SHIFT_SELECT
    set 0,b
    jr AMY_FP5_TO_FX16_16_SIGN_READY
AMY_FP5_TO_FX16_16_SHIFT_SELECT:
    res 0,b
AMY_FP5_TO_FX16_16_SIGN_READY:
    ld a,c
    cp 144
    jr c,AMY_FP5_TO_FX16_16_RIGHT
    jr z,AMY_FP5_TO_FX16_16_APPLY_SIGN
    sub 144
    ld c,a
AMY_FP5_TO_FX16_16_LEFT_LOOP:
    ld a,c
    or a
    jr z,AMY_FP5_TO_FX16_16_APPLY_SIGN
    push de
    ex de,hl
    sla (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    pop de
    dec c
    jr AMY_FP5_TO_FX16_16_LEFT_LOOP

AMY_FP5_TO_FX16_16_RIGHT:
    ld a,144
    sub c
    ld c,a
AMY_FP5_TO_FX16_16_RIGHT_LOOP:
    ld a,c
    or a
    jr z,AMY_FP5_TO_FX16_16_APPLY_SIGN
    push de
    ex de,hl
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
    pop de
    dec c
    jr AMY_FP5_TO_FX16_16_RIGHT_LOOP

AMY_FP5_TO_FX16_16_APPLY_SIGN:
    bit 0,b
    ret z
    push de
    ex de,hl
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
    pop de
    ex de,hl
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

; Convert signed 16.16 at HL into FPA1.
; Input: HL = source pointer (4 bytes)
; Output: FPA1 updated
AMY_FX16_16_TO_FP5:
    ld a,(hl)
    ld (AMY_FP5_MANT1+0),a
    inc hl
    ld a,(hl)
    ld (AMY_FP5_MANT1+1),a
    inc hl
    ld a,(hl)
    ld (AMY_FP5_MANT1+2),a
    inc hl
    ld a,(hl)
    ld (AMY_FP5_MANT1+3),a
    bit 7,a
    jr z,AMY_FX16_16_TO_FP5_POSITIVE
    ld a,1
    ld (AMY_FP5_META+0),a
    ld a,(AMY_FP5_MANT1+0)
    cpl
    ld (AMY_FP5_MANT1+0),a
    ld a,(AMY_FP5_MANT1+1)
    cpl
    ld (AMY_FP5_MANT1+1),a
    ld a,(AMY_FP5_MANT1+2)
    cpl
    ld (AMY_FP5_MANT1+2),a
    ld a,(AMY_FP5_MANT1+3)
    cpl
    ld (AMY_FP5_MANT1+3),a
    ld hl,AMY_FP5_MANT1+0
    inc (hl)
    jr nz,AMY_FX16_16_TO_FP5_HAVE_ABS
    ld hl,AMY_FP5_MANT1+1
    inc (hl)
    jr nz,AMY_FX16_16_TO_FP5_HAVE_ABS
    ld hl,AMY_FP5_MANT1+2
    inc (hl)
    jr nz,AMY_FX16_16_TO_FP5_HAVE_ABS
    ld hl,AMY_FP5_MANT1+3
    inc (hl)
    jr AMY_FX16_16_TO_FP5_HAVE_ABS

AMY_FX16_16_TO_FP5_POSITIVE:
    xor a
    ld (AMY_FP5_META+0),a

AMY_FX16_16_TO_FP5_HAVE_ABS:
    call AMY_FP5_MANT1_IS_ZERO
    jr nz,AMY_FX16_16_TO_FP5_NONZERO
    ld hl,AMY_FP5_FPA1
    jp AMY_FP5_ZERO_MEM

AMY_FX16_16_TO_FP5_NONZERO:
    ld a,144
    ld (AMY_FP5_META+1),a
AMY_FX16_16_TO_FP5_NORMALIZE:
    ld a,(AMY_FP5_MANT1+3)
    bit 7,a
    jr nz,AMY_FX16_16_TO_FP5_PACK
    call AMY_FP5_SHIFT_MANT1_LEFT
    ld hl,AMY_FP5_META+1
    dec (hl)
    jr AMY_FX16_16_TO_FP5_NORMALIZE

AMY_FX16_16_TO_FP5_PACK:
    ld a,(AMY_FP5_MANT1+0)
    ld (AMY_FP5_FPA1+0),a
    ld a,(AMY_FP5_MANT1+1)
    ld (AMY_FP5_FPA1+1),a
    ld a,(AMY_FP5_MANT1+2)
    ld (AMY_FP5_FPA1+2),a
    ld a,(AMY_FP5_MANT1+3)
    and $7F
    ld b,a
    ld a,(AMY_FP5_META+0)
    or a
    ld a,b
    jr z,AMY_FX16_16_TO_FP5_PACK_POS
    or $80
AMY_FX16_16_TO_FP5_PACK_POS:
    ld (AMY_FP5_FPA1+3),a
    ld a,(AMY_FP5_META+1)
    ld (AMY_FP5_FPA1+4),a
    ret

; Convert unsigned 16.16 at HL into FPA1.
; Input: HL = source pointer (4 bytes)
; Output: FPA1 updated
AMY_UFX16_16_TO_FP5:
    ld a,(hl)
    ld (AMY_FP5_MANT1+0),a
    inc hl
    ld a,(hl)
    ld (AMY_FP5_MANT1+1),a
    inc hl
    ld a,(hl)
    ld (AMY_FP5_MANT1+2),a
    inc hl
    ld a,(hl)
    ld (AMY_FP5_MANT1+3),a
    xor a
    ld (AMY_FP5_META+0),a
    call AMY_FP5_MANT1_IS_ZERO
    jr nz,AMY_UFX16_16_TO_FP5_NONZERO
    ld hl,AMY_FP5_FPA1
    jp AMY_FP5_ZERO_MEM

AMY_UFX16_16_TO_FP5_NONZERO:
    ld a,144
    ld (AMY_FP5_META+1),a
AMY_UFX16_16_TO_FP5_NORMALIZE:
    ld a,(AMY_FP5_MANT1+3)
    bit 7,a
    jr nz,AMY_UFX16_16_TO_FP5_PACK
    call AMY_FP5_SHIFT_MANT1_LEFT
    ld hl,AMY_FP5_META+1
    dec (hl)
    jr AMY_UFX16_16_TO_FP5_NORMALIZE

AMY_UFX16_16_TO_FP5_PACK:
    ld a,(AMY_FP5_MANT1+0)
    ld (AMY_FP5_FPA1+0),a
    ld a,(AMY_FP5_MANT1+1)
    ld (AMY_FP5_FPA1+1),a
    ld a,(AMY_FP5_MANT1+2)
    ld (AMY_FP5_FPA1+2),a
    ld a,(AMY_FP5_MANT1+3)
    and $7F
    ld (AMY_FP5_FPA1+3),a
    ld a,(AMY_FP5_META+1)
    ld (AMY_FP5_FPA1+4),a
    ret
