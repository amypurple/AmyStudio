; -----------------------------------------------------------------------------
; ALEXIS fixed-point 16.16 formatting helpers
; Depends on: coleco_math_format.asm    (AMY_U16_TO_ASCII5)
;             coleco_math_format_u8.asm (AMY_U8_TO_ASCII2)
;             coleco_math_fx16_core.asm (AMY_FX16_16_NEG)
;             coleco_math_fx16_mul_helpers.asm (AMY_U16_MUL32_TO_TMP)
; -----------------------------------------------------------------------------

; Scratch copy used so formatting can negate a temporary value without touching
; the source variable. Keep it in the tail of AMY_BUFFER32 so it resolves to a
; concrete address even in builds that only pull formatting helpers.
AMY_FX16_16_FMT_WORK EQU AMY_BUFFER32+25

; Convert a 16-bit fractional part (0..65535) into 0..99 hundredths.
; Input:  HL = fractional word
; Output: A = approximate floor((HL * 100) / 65536)
; Note:
;   Use the high fractional byte as an 8.8-style fraction. This keeps the
;   formatter compact and is exact for common values like .00, .25, .50, .75.
AMY_FX16_16_FRAC_TO_HUNDREDTHS:
    ld l,h
    ld h,0
    add hl,hl
    add hl,hl
    ld d,h
    ld e,l
    add hl,hl
    add hl,hl
    add hl,hl
    push hl
    add hl,hl
    pop bc
    add hl,bc
    add hl,de
    ld a,h
    ret

; Format a 16-bit fractional part (0..65535) as four decimal digits.
; Input:  HL = fractional word
;         DE = destination buffer (4 bytes)
; Output: writes exactly 4 ASCII digits
; Notes:
;   Repeatedly multiply the remaining fraction by 10. The high word gives the
;   next decimal digit, and the low word becomes the new remainder.
AMY_FX16_16_FRAC_TO_ASCII4:
    push de
    ld de,$000A
    call AMY_U16_MUL32_TO_TMP
    pop de
    ld a,(AMY_FX16_MUL64+2)
    add a,$30
    ld (de),a
    inc de
    ld a,(AMY_FX16_MUL64+0)
    ld l,a
    ld a,(AMY_FX16_MUL64+1)
    ld h,a

    push de
    ld de,$000A
    call AMY_U16_MUL32_TO_TMP
    pop de
    ld a,(AMY_FX16_MUL64+2)
    add a,$30
    ld (de),a
    inc de
    ld a,(AMY_FX16_MUL64+0)
    ld l,a
    ld a,(AMY_FX16_MUL64+1)
    ld h,a

    push de
    ld de,$000A
    call AMY_U16_MUL32_TO_TMP
    pop de
    ld a,(AMY_FX16_MUL64+2)
    add a,$30
    ld (de),a
    inc de
    ld a,(AMY_FX16_MUL64+0)
    ld l,a
    ld a,(AMY_FX16_MUL64+1)
    ld h,a

    push de
    ld de,$000A
    call AMY_U16_MUL32_TO_TMP
    pop de
    ld a,(AMY_FX16_MUL64+2)
    add a,$30
    ld (de),a
    ret

; Format a signed 16.16 value as "sddddd.ff".
; Input:  HL = pointer to 4-byte value in RAM
;         DE = destination buffer (9 bytes)
; Output: writes exactly 9 ASCII bytes
AMY_FX16_16_TO_ASCII9:
    push hl
    inc hl
    inc hl
    inc hl
    ld a,(hl)
    pop hl
    bit 7,a
    jr nz,AMY_FX16_16_TO_ASCII9_NEGATIVE
    ld a,' '
    ld (de),a
    inc de
    ld bc,4
    push de
    ld de,AMY_FX16_16_FMT_WORK
    ldir
    pop de
    jr AMY_FX16_16_TO_ASCII9_RENDER
AMY_FX16_16_TO_ASCII9_NEGATIVE:
    ld a,'-'
    ld (de),a
    inc de
    ld bc,4
    push de
    ld de,AMY_FX16_16_FMT_WORK
    ldir
    ld hl,AMY_FX16_16_FMT_WORK
    call AMY_FX16_16_NEG
    pop de
AMY_FX16_16_TO_ASCII9_RENDER:
    ld hl,(AMY_FX16_16_FMT_WORK+2)
    call AMY_U16_TO_ASCII5
    inc de
    ld a,'.'
    ld (de),a
    inc de
    ld hl,(AMY_FX16_16_FMT_WORK+0)
    push de
    call AMY_FX16_16_FRAC_TO_HUNDREDTHS
    pop de
    jp AMY_U8_TO_ASCII2

; Format a signed 16.16 value as "sddddd.ffff".
; Input:  HL = pointer to 4-byte value in RAM
;         DE = destination buffer (11 bytes)
; Output: writes exactly 11 ASCII bytes
AMY_FX16_16_TO_ASCII11:
    push hl
    inc hl
    inc hl
    inc hl
    ld a,(hl)
    pop hl
    bit 7,a
    jr nz,AMY_FX16_16_TO_ASCII11_NEGATIVE
    ld a,' '
    ld (de),a
    inc de
    ld bc,4
    push de
    ld de,AMY_FX16_16_FMT_WORK
    ldir
    pop de
    jr AMY_FX16_16_TO_ASCII11_RENDER
AMY_FX16_16_TO_ASCII11_NEGATIVE:
    ld a,'-'
    ld (de),a
    inc de
    ld bc,4
    push de
    ld de,AMY_FX16_16_FMT_WORK
    ldir
    ld hl,AMY_FX16_16_FMT_WORK
    call AMY_FX16_16_NEG
    pop de
AMY_FX16_16_TO_ASCII11_RENDER:
    ld hl,(AMY_FX16_16_FMT_WORK+2)
    call AMY_U16_TO_ASCII5
    inc de
    ld a,'.'
    ld (de),a
    inc de
    ld hl,(AMY_FX16_16_FMT_WORK+0)
    jp AMY_FX16_16_FRAC_TO_ASCII4
