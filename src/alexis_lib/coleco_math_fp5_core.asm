; -----------------------------------------------------------------------------
; ALEXIS 5-byte float helpers (SmartBASIC / Microsoft-family layout)
; Layout: [m0][m1][m2][m3/sign][exp]
; Current tranche:
;   - zero/copy/load/store
;   - u16 -> FPA1
;   - i16 -> FPA1
;   - fp5 += / -= core on FPA1/FPA2
; -----------------------------------------------------------------------------

AMY_FP5_FPA1 EQU AMY_BUFFER32+0
AMY_FP5_FPA2 EQU AMY_BUFFER32+5
AMY_FP5_MANT1 EQU AMY_BUFFER32+10
AMY_FP5_MANT2 EQU AMY_BUFFER32+14
AMY_FP5_META  EQU AMY_BUFFER32+18
AMY_FP5_MUL_A64 EQU AMY_BUFFER32+8
AMY_FP5_MUL_B32 EQU AMY_BUFFER32+16
AMY_FP5_MUL_SIGN EQU AMY_BUFFER32+20
AMY_FP5_MUL_EXP  EQU AMY_BUFFER32+21
AMY_FP5_MUL_OP1 EQU AMY_BUFFER32+24
AMY_FP5_MUL_OP2 EQU AMY_BUFFER32+28
AMY_FP5_MUL64 EQU AMY_BUFFER32+16
AMY_FP5_SQRT_N   EQU AMY_BUFFER32+0
AMY_FP5_SQRT_RES EQU AMY_BUFFER32+8
AMY_FP5_SQRT_BIT EQU AMY_BUFFER32+16
AMY_FP5_SQRT_TMP EQU AMY_BUFFER32+24
AMY_FP5_DIV_REM64 EQU AMY_BUFFER32+0
AMY_FP5_DIV_DEN64 EQU AMY_BUFFER32+8
AMY_FP5_DIV_QUO32 EQU AMY_BUFFER32+16
AMY_FP5_DIV_SIGN  EQU AMY_BUFFER32+20
AMY_FP5_DIV_EXP   EQU AMY_BUFFER32+21
AMY_FP5_DIV_NUM3  EQU AMY_BUFFER32+22
AMY_FP5_FMT_TMP40 EQU AMY_BUFFER32+0
AMY_FP5_FMT_REM32 EQU AMY_BUFFER32+14
AMY_FP5_FMT_INT32 EQU AMY_BUFFER32+18
AMY_FP5_EXP_K     EQU AMY_BUFFER32+23

; Clear a 5-byte float in RAM.
; Input: HL = destination pointer
AMY_FP5_ZERO_MEM:
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

; Copy one 5-byte float to another.
; Input: HL = destination pointer
;        DE = source pointer
AMY_FP5_COPY_MEM:
    ex de,hl
    ld bc,5
    ldir
    ret

; Load a 5-byte float from RAM into FPA1.
; Input: HL = source pointer
AMY_FP5_LOAD_MEM_TO_FPA1:
    ld de,AMY_FP5_FPA1
    ld bc,5
    ldir
    ret

; Store FPA1 into RAM.
; Input: HL = destination pointer
AMY_FP5_STORE_FPA1_TO_MEM:
    push hl
    pop de
    ld hl,AMY_FP5_FPA1
    ld bc,5
    ldir
    ret

; Load a 5-byte float from RAM into FPA2.
; Input: HL = source pointer
AMY_FP5_LOAD_MEM_TO_FPA2:
    ld de,AMY_FP5_FPA2
    ld bc,5
    ldir
    ret

; Store FPA2 into RAM.
; Input: HL = destination pointer
AMY_FP5_STORE_FPA2_TO_MEM:
    push hl
    pop de
    ld hl,AMY_FP5_FPA2
    ld bc,5
    ldir
    ret

; Absolute value in place.
; Input: HL = pointer to 5-byte float
AMY_FP5_ABS_MEM:
    inc hl
    inc hl
    inc hl
    ld a,(hl)
    and $7F
    ld (hl),a
    ret

; Divide FPA2 by 2 in place.
; Output: FPA2 = FPA2 / 2
; Notes:
;   - exact for normalized nonzero fp5 values
;   - zero stays zero
AMY_FP5_HALF_FPA2:
    ld a,(AMY_FP5_FPA2+4)
    or a
    ret z
    ld hl,AMY_FP5_FPA2+4
    dec (hl)
    ret

; Convert unsigned 16-bit integer in DE into FPA1.
; Input: DE = unsigned value
; Output: FPA1 updated
AMY_FP5_U16_DE_TO_FPA1:
    ld a,d
    or e
    jr nz,AMY_FP5_U16_DE_TO_FPA1_NONZERO
    ld hl,AMY_FP5_FPA1
    jp AMY_FP5_ZERO_MEM

AMY_FP5_U16_DE_TO_FPA1_NONZERO:
    ld h,d
    ld l,e
    ld b,0
AMY_FP5_U16_DE_TO_FPA1_COUNT_BITS:
    srl h
    rr l
    inc b
    ld a,h
    or l
    jr nz,AMY_FP5_U16_DE_TO_FPA1_COUNT_BITS

    ld a,e
    ld (AMY_FP5_FPA1+0),a
    ld a,d
    ld (AMY_FP5_FPA1+1),a
    xor a
    ld (AMY_FP5_FPA1+2),a
    ld (AMY_FP5_FPA1+3),a

    ld a,32
    sub b
    ld c,a
AMY_FP5_U16_DE_TO_FPA1_SHIFT_LOOP:
    ld a,c
    or a
    jr z,AMY_FP5_U16_DE_TO_FPA1_SHIFT_DONE
    ld hl,AMY_FP5_FPA1
    sla (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    dec c
    jr AMY_FP5_U16_DE_TO_FPA1_SHIFT_LOOP

AMY_FP5_U16_DE_TO_FPA1_SHIFT_DONE:
    ld a,(AMY_FP5_FPA1+3)
    and $7F
    ld (AMY_FP5_FPA1+3),a
    ld a,b
    add a,$80
    ld (AMY_FP5_FPA1+4),a
    ret

; Convert signed 16-bit integer in DE into FPA1.
; Input: DE = signed value
; Output: FPA1 updated
AMY_FP5_I16_DE_TO_FPA1:
    ld a,d
    or e
    jr z,AMY_FP5_I16_DE_TO_FPA1_ZERO
    bit 7,d
    jr z,AMY_FP5_I16_DE_TO_FPA1_POSITIVE
    ld a,e
    cpl
    ld e,a
    ld a,d
    cpl
    ld d,a
    inc de
    call AMY_FP5_U16_DE_TO_FPA1
    ld a,(AMY_FP5_FPA1+3)
    or $80
    ld (AMY_FP5_FPA1+3),a
    ret

AMY_FP5_I16_DE_TO_FPA1_POSITIVE:
    jp AMY_FP5_U16_DE_TO_FPA1

AMY_FP5_I16_DE_TO_FPA1_ZERO:
    ld hl,AMY_FP5_FPA1
    jp AMY_FP5_ZERO_MEM

; Load an unsigned 16-bit integer from RAM into FPA1.
; Input: HL = pointer to 2-byte source value
AMY_FP5_LOAD_U16_MEM_TO_FPA1:
    ld e,(hl)
    inc hl
    ld d,(hl)
    jp AMY_FP5_U16_DE_TO_FPA1

; Load a signed 16-bit integer from RAM into FPA1.
; Input: HL = pointer to 2-byte source value
AMY_FP5_LOAD_I16_MEM_TO_FPA1:
    ld e,(hl)
    inc hl
    ld d,(hl)
    jp AMY_FP5_I16_DE_TO_FPA1

; Load an unsigned 16-bit integer from RAM into FPA2.
; Input: HL = pointer to 2-byte source value
AMY_FP5_LOAD_U16_MEM_TO_FPA2:
    call AMY_FP5_LOAD_U16_MEM_TO_FPA1
    jp AMY_FP5_COPY_FPA1_TO_FPA2

; Load a signed 16-bit integer from RAM into FPA2.
; Input: HL = pointer to 2-byte source value
AMY_FP5_LOAD_I16_MEM_TO_FPA2:
    call AMY_FP5_LOAD_I16_MEM_TO_FPA1
    jp AMY_FP5_COPY_FPA1_TO_FPA2

; Convert unsigned 16-bit integer in HL into FPA1.
; Input: HL = unsigned value
; Output: FPA1 updated
AMY_FP5_U16_TO_FPA1:
    ld d,h
    ld e,l
    jp AMY_FP5_U16_DE_TO_FPA1

; Convert signed 16-bit integer in HL into FPA1.
; Input: HL = signed value
; Output: FPA1 updated
AMY_FP5_I16_TO_FPA1:
    ld d,h
    ld e,l
    jp AMY_FP5_I16_DE_TO_FPA1

AMY_FP5_COPY_FPA1_TO_FPA2:
    ld hl,AMY_FP5_FPA1
    ld de,AMY_FP5_FPA2
    ld bc,5
    ldir
    ret

AMY_FP5_COPY_FPA2_TO_FPA1:
    ld hl,AMY_FP5_FPA2
    ld de,AMY_FP5_FPA1
    ld bc,5
    ldir
    ret

AMY_FP5_CLEAR_MANT1:
    xor a
    ld (AMY_FP5_MANT1+0),a
    ld (AMY_FP5_MANT1+1),a
    ld (AMY_FP5_MANT1+2),a
    ld (AMY_FP5_MANT1+3),a
    ret

AMY_FP5_CLEAR_MANT2:
    xor a
    ld (AMY_FP5_MANT2+0),a
    ld (AMY_FP5_MANT2+1),a
    ld (AMY_FP5_MANT2+2),a
    ld (AMY_FP5_MANT2+3),a
    ret

AMY_FP5_MANT1_IS_ZERO:
    ld a,(AMY_FP5_MANT1+0)
    ld b,a
    ld a,(AMY_FP5_MANT1+1)
    or b
    ld b,a
    ld a,(AMY_FP5_MANT1+2)
    or b
    ld b,a
    ld a,(AMY_FP5_MANT1+3)
    or b
    ret

AMY_FP5_CMP_MANT1_MANT2:
    ld a,(AMY_FP5_MANT1+3)
    ld b,a
    ld a,(AMY_FP5_MANT2+3)
    ld c,a
    ld a,b
    cp c
    ret nz
    ld a,(AMY_FP5_MANT1+2)
    ld b,a
    ld a,(AMY_FP5_MANT2+2)
    ld c,a
    ld a,b
    cp c
    ret nz
    ld a,(AMY_FP5_MANT1+1)
    ld b,a
    ld a,(AMY_FP5_MANT2+1)
    ld c,a
    ld a,b
    cp c
    ret nz
    ld a,(AMY_FP5_MANT1+0)
    ld b,a
    ld a,(AMY_FP5_MANT2+0)
    ld c,a
    ld a,b
    cp c
    ret

AMY_FP5_ADD_MANT2_TO_MANT1:
    ld a,(AMY_FP5_MANT1+0)
    ld b,a
    ld a,(AMY_FP5_MANT2+0)
    add a,b
    ld (AMY_FP5_MANT1+0),a
    ld a,(AMY_FP5_MANT1+1)
    ld b,a
    ld a,(AMY_FP5_MANT2+1)
    adc a,b
    ld (AMY_FP5_MANT1+1),a
    ld a,(AMY_FP5_MANT1+2)
    ld b,a
    ld a,(AMY_FP5_MANT2+2)
    adc a,b
    ld (AMY_FP5_MANT1+2),a
    ld a,(AMY_FP5_MANT1+3)
    ld b,a
    ld a,(AMY_FP5_MANT2+3)
    adc a,b
    ld (AMY_FP5_MANT1+3),a
    ret

AMY_FP5_SUB_MANT2_FROM_MANT1:
    ld a,(AMY_FP5_MANT1+0)
    ld b,a
    ld a,(AMY_FP5_MANT2+0)
    ld c,a
    ld a,b
    sub c
    ld (AMY_FP5_MANT1+0),a
    ld a,(AMY_FP5_MANT1+1)
    ld b,a
    ld a,(AMY_FP5_MANT2+1)
    ld c,a
    ld a,b
    sbc a,c
    ld (AMY_FP5_MANT1+1),a
    ld a,(AMY_FP5_MANT1+2)
    ld b,a
    ld a,(AMY_FP5_MANT2+2)
    ld c,a
    ld a,b
    sbc a,c
    ld (AMY_FP5_MANT1+2),a
    ld a,(AMY_FP5_MANT1+3)
    ld b,a
    ld a,(AMY_FP5_MANT2+3)
    ld c,a
    ld a,b
    sbc a,c
    ld (AMY_FP5_MANT1+3),a
    ret

AMY_FP5_SUB_MANT1_FROM_MANT2:
    ld a,(AMY_FP5_MANT2+0)
    ld b,a
    ld a,(AMY_FP5_MANT1+0)
    ld c,a
    ld a,b
    sub c
    ld (AMY_FP5_MANT2+0),a
    ld a,(AMY_FP5_MANT2+1)
    ld b,a
    ld a,(AMY_FP5_MANT1+1)
    ld c,a
    ld a,b
    sbc a,c
    ld (AMY_FP5_MANT2+1),a
    ld a,(AMY_FP5_MANT2+2)
    ld b,a
    ld a,(AMY_FP5_MANT1+2)
    ld c,a
    ld a,b
    sbc a,c
    ld (AMY_FP5_MANT2+2),a
    ld a,(AMY_FP5_MANT2+3)
    ld b,a
    ld a,(AMY_FP5_MANT1+3)
    ld c,a
    ld a,b
    sbc a,c
    ld (AMY_FP5_MANT2+3),a
    ret

AMY_FP5_SHIFT_MANT1_RIGHT:
    ld a,(AMY_FP5_MANT1+3)
    srl a
    ld (AMY_FP5_MANT1+3),a
    ld a,(AMY_FP5_MANT1+2)
    rr a
    ld (AMY_FP5_MANT1+2),a
    ld a,(AMY_FP5_MANT1+1)
    rr a
    ld (AMY_FP5_MANT1+1),a
    ld a,(AMY_FP5_MANT1+0)
    rr a
    ld (AMY_FP5_MANT1+0),a
    ret

AMY_FP5_SHIFT_MANT2_RIGHT:
    ld a,(AMY_FP5_MANT2+3)
    srl a
    ld (AMY_FP5_MANT2+3),a
    ld a,(AMY_FP5_MANT2+2)
    rr a
    ld (AMY_FP5_MANT2+2),a
    ld a,(AMY_FP5_MANT2+1)
    rr a
    ld (AMY_FP5_MANT2+1),a
    ld a,(AMY_FP5_MANT2+0)
    rr a
    ld (AMY_FP5_MANT2+0),a
    ret

AMY_FP5_SHIFT_MANT1_LEFT:
    ld a,(AMY_FP5_MANT1+0)
    add a,a
    ld (AMY_FP5_MANT1+0),a
    ld a,(AMY_FP5_MANT1+1)
    rla
    ld (AMY_FP5_MANT1+1),a
    ld a,(AMY_FP5_MANT1+2)
    rla
    ld (AMY_FP5_MANT1+2),a
    ld a,(AMY_FP5_MANT1+3)
    rla
    ld (AMY_FP5_MANT1+3),a
    ret

AMY_FP5_COPY_MANT1_TO_MANT2:
    ld a,(AMY_FP5_MANT1+0)
    ld (AMY_FP5_MANT2+0),a
    ld a,(AMY_FP5_MANT1+1)
    ld (AMY_FP5_MANT2+1),a
    ld a,(AMY_FP5_MANT1+2)
    ld (AMY_FP5_MANT2+2),a
    ld a,(AMY_FP5_MANT1+3)
    ld (AMY_FP5_MANT2+3),a
    ret

AMY_FP5_COPY_MANT2_TO_MANT1:
    ld a,(AMY_FP5_MANT2+0)
    ld (AMY_FP5_MANT1+0),a
    ld a,(AMY_FP5_MANT2+1)
    ld (AMY_FP5_MANT1+1),a
    ld a,(AMY_FP5_MANT2+2)
    ld (AMY_FP5_MANT1+2),a
    ld a,(AMY_FP5_MANT2+3)
    ld (AMY_FP5_MANT1+3),a
    ret

