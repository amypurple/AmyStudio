; -----------------------------------------------------------------------------
; ALEXIS 16-bit divide helpers
; -----------------------------------------------------------------------------

AMY_U16_DIV_DIVIDEND EQU AMY_BUFFER32+0
AMY_U16_DIV_DIVISOR  EQU AMY_BUFFER32+2
AMY_U16_DIV_QUOTIENT EQU AMY_BUFFER32+4
AMY_U16_DIV_REM      EQU AMY_BUFFER32+6
AMY_U16_DIV_COUNT    EQU AMY_BUFFER32+8
AMY_U16_DIV_SIGN     EQU AMY_BUFFER32+9

; Unsigned 16-bit divide.
; Input:  HL = dividend, BC = divisor
; Output: HL = quotient. Division by zero returns 0.
AMY_U16_DIV:
    ld a,b
    or c
    jr nz,AMY_U16_DIV_NONZERO
    ld hl,0
    ret
AMY_U16_DIV_NONZERO:
    ld (AMY_U16_DIV_DIVIDEND),hl
    ld (AMY_U16_DIV_DIVISOR),bc
    ld hl,0
    ld (AMY_U16_DIV_QUOTIENT),hl
    ld (AMY_U16_DIV_REM),hl
    ld a,16
    ld (AMY_U16_DIV_COUNT),a

AMY_U16_DIV_LOOP:
    ld hl,AMY_U16_DIV_DIVIDEND
    sla (hl)
    inc hl
    rl (hl)
    ld hl,AMY_U16_DIV_REM
    rl (hl)
    inc hl
    rl (hl)
    ld hl,AMY_U16_DIV_QUOTIENT
    sla (hl)
    inc hl
    rl (hl)

    ld hl,(AMY_U16_DIV_REM)
    ld de,(AMY_U16_DIV_DIVISOR)
    ld a,h
    cp d
    jr c,AMY_U16_DIV_NEXT
    jr nz,AMY_U16_DIV_SUBTRACT
    ld a,l
    cp e
    jr c,AMY_U16_DIV_NEXT
AMY_U16_DIV_SUBTRACT:
    or a
    sbc hl,de
    ld (AMY_U16_DIV_REM),hl
    ld hl,AMY_U16_DIV_QUOTIENT
    ld a,(hl)
    or 1
    ld (hl),a

AMY_U16_DIV_NEXT:
    ld hl,AMY_U16_DIV_COUNT
    dec (hl)
    jr nz,AMY_U16_DIV_LOOP
    ld hl,(AMY_U16_DIV_QUOTIENT)
    ret

; Signed 16-bit divide.
; Input:  HL = dividend, BC = divisor
; Output: HL = quotient. Division by zero returns 0.
; Semantics:
;   - quotient truncates toward zero (-21/3=-7, 21/-3=-7, -21/-3=7)
;   - this intentionally differs from Amy's floor-style int conversion
;   - overflow wraps in two's-complement form (-32768/-1 returns $8000)
AMY_I16_DIV:
    ld a,b
    or c
    jr nz,AMY_I16_DIV_NONZERO
    ld hl,0
    ret
AMY_I16_DIV_NONZERO:
    xor a
    ld (AMY_U16_DIV_SIGN),a
    bit 7,h
    jr z,AMY_I16_DIV_CHECK_RIGHT
    call AMY_I16_DIV_NEG_HL
    ld a,1
    ld (AMY_U16_DIV_SIGN),a
AMY_I16_DIV_CHECK_RIGHT:
    bit 7,b
    jr z,AMY_I16_DIV_DO_DIV
    ld a,c
    cpl
    ld c,a
    ld a,b
    cpl
    ld b,a
    inc bc
    ld a,(AMY_U16_DIV_SIGN)
    xor 1
    ld (AMY_U16_DIV_SIGN),a
AMY_I16_DIV_DO_DIV:
    call AMY_U16_DIV
    ld a,(AMY_U16_DIV_SIGN)
    or a
    ret z
    jp AMY_I16_DIV_NEG_HL

; Signed 16-bit modulo.
; Input:  HL = dividend, BC = divisor
; Output: HL = remainder. Division by zero returns 0.
; Semantics:
;   - quotient truncates toward zero
;   - remainder keeps the sign of the dividend (-7 % 3 = -1)
;   - identity: dividend = (dividend / divisor) * divisor + remainder
AMY_I16_MOD:
    ld a,b
    or c
    jr nz,AMY_I16_MOD_NONZERO
    ld hl,0
    ret
AMY_I16_MOD_NONZERO:
    xor a
    ld (AMY_U16_DIV_SIGN),a
    bit 7,h
    jr z,AMY_I16_MOD_CHECK_RIGHT
    call AMY_I16_DIV_NEG_HL
    ld a,1
    ld (AMY_U16_DIV_SIGN),a
AMY_I16_MOD_CHECK_RIGHT:
    bit 7,b
    jr z,AMY_I16_MOD_DO_DIV
    ld a,c
    cpl
    ld c,a
    ld a,b
    cpl
    ld b,a
    inc bc
AMY_I16_MOD_DO_DIV:
    call AMY_U16_DIV
    ld hl,(AMY_U16_DIV_REM)
    ld a,(AMY_U16_DIV_SIGN)
    or a
    ret z
    jp AMY_I16_DIV_NEG_HL

AMY_I16_DIV_NEG_HL:
    ld a,l
    cpl
    ld l,a
    ld a,h
    cpl
    ld h,a
    inc hl
    ret
