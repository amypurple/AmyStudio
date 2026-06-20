; -----------------------------------------------------------------------------
; ALEXIS fixed 8.8 divide helper
; Depends on: coleco_math_u32_div.asm
; -----------------------------------------------------------------------------

AMY_FX8_8_DIV_LEFT  EQU AMY_BUFFER32+0
AMY_FX8_8_DIV_RIGHT EQU AMY_BUFFER32+4

; Signed fixed 8.8 divide.
; Input:  HL = left, DE = right
; Output: HL = (left << 8) / right. Division by zero returns 0.
AMY_FX8_8_DIV:
    ld b,0
    bit 7,h
    jr z,AMY_FX8_8_DIV_CHECK_RIGHT
    call AMY_FX8_8_DIV_NEG_HL
    ld b,1
AMY_FX8_8_DIV_CHECK_RIGHT:
    bit 7,d
    jr z,AMY_FX8_8_DIV_BUILD
    ex de,hl
    call AMY_FX8_8_DIV_NEG_HL
    ex de,hl
    ld a,b
    xor 1
    ld b,a
AMY_FX8_8_DIV_BUILD:
    xor a
    ld (AMY_FX8_8_DIV_LEFT+0),a
    ld a,l
    ld (AMY_FX8_8_DIV_LEFT+1),a
    ld a,h
    ld (AMY_FX8_8_DIV_LEFT+2),a
    xor a
    ld (AMY_FX8_8_DIV_LEFT+3),a
    ld a,e
    ld (AMY_FX8_8_DIV_RIGHT+0),a
    ld a,d
    ld (AMY_FX8_8_DIV_RIGHT+1),a
    xor a
    ld (AMY_FX8_8_DIV_RIGHT+2),a
    ld (AMY_FX8_8_DIV_RIGHT+3),a
    push bc
    ld hl,AMY_FX8_8_DIV_LEFT
    ld de,AMY_FX8_8_DIV_RIGHT
    call AMY_U32_DIV
    pop bc
    ld hl,(AMY_FX8_8_DIV_LEFT+0)
    ld a,b
    or a
    ret z
    jp AMY_FX8_8_DIV_NEG_HL

AMY_FX8_8_DIV_NEG_HL:
    ld a,l
    cpl
    ld l,a
    ld a,h
    cpl
    ld h,a
    inc hl
    ret
