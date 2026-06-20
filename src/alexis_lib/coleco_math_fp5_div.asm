; -----------------------------------------------------------------------------
; ALEXIS fp5 divide helpers
; Depends on: coleco_math_fp5_core.asm
;             coleco_math_fp5_format_helpers.asm (AMY_FP5_FMT_SHIFT32_LEFT_HL)
;             coleco_math_fp5_div64.asm
;             coleco_math_u32_inc.asm
; -----------------------------------------------------------------------------

; Core: FPA2 = FPA2 / FPA1
; Notes:
;   - true fp5 divide, no fixed32 bridge
;   - uses restored 32-bit mantissas and a 32-bit quotient build
;   - rounds the 32-bit mantissa quotient to nearest
AMY_FP5_DIV_FPA1_FPA2:
    ld a,(AMY_FP5_FPA1+4)
    or a
    jp z,AMY_FP5_DIV_FPA1_FPA2_ZERO
    ld a,(AMY_FP5_FPA2+4)
    or a
    jp z,AMY_FP5_DIV_FPA1_FPA2_ZERO

    ld a,(AMY_FP5_FPA1+3)
    ld b,a
    ld a,(AMY_FP5_FPA2+3)
    xor b
    and $80
    ld (AMY_FP5_DIV_SIGN),a
    ld a,(AMY_FP5_FPA2+3)
    ld (AMY_FP5_DIV_NUM3),a

    ld a,(AMY_FP5_FPA2+4)
    ld b,a
    ld a,(AMY_FP5_FPA1+4)
    ld c,a
    ld a,b
    sub c
    add a,129
    ld (AMY_FP5_DIV_EXP),a

    ld a,(AMY_FP5_FPA1+0)
    ld (AMY_FP5_DIV_DEN64+0),a
    ld a,(AMY_FP5_FPA1+1)
    ld (AMY_FP5_DIV_DEN64+1),a
    ld a,(AMY_FP5_FPA1+2)
    ld (AMY_FP5_DIV_DEN64+2),a
    ld a,(AMY_FP5_FPA1+3)
    and $7F
    or $80
    ld (AMY_FP5_DIV_DEN64+3),a
    xor a
    ld (AMY_FP5_DIV_DEN64+4),a
    ld (AMY_FP5_DIV_DEN64+5),a
    ld (AMY_FP5_DIV_DEN64+6),a
    ld (AMY_FP5_DIV_DEN64+7),a

    ld a,(AMY_FP5_FPA2+0)
    ld (AMY_FP5_DIV_REM64+0),a
    ld a,(AMY_FP5_FPA2+1)
    ld (AMY_FP5_DIV_REM64+1),a
    ld a,(AMY_FP5_FPA2+2)
    ld (AMY_FP5_DIV_REM64+2),a
    ld a,(AMY_FP5_DIV_NUM3)
    and $7F
    or $80
    ld (AMY_FP5_DIV_REM64+3),a
    xor a
    ld (AMY_FP5_DIV_REM64+4),a
    ld (AMY_FP5_DIV_REM64+5),a
    ld (AMY_FP5_DIV_REM64+6),a
    ld (AMY_FP5_DIV_REM64+7),a

    xor a
    ld (AMY_FP5_DIV_QUO32+0),a
    ld (AMY_FP5_DIV_QUO32+1),a
    ld (AMY_FP5_DIV_QUO32+2),a
    ld (AMY_FP5_DIV_QUO32+3),a

    ld b,32
AMY_FP5_DIV_FPA1_FPA2_LOOP:
    push bc
    ld hl,AMY_FP5_DIV_QUO32
    call AMY_FP5_FMT_SHIFT32_LEFT_HL
    ld hl,AMY_FP5_DIV_REM64
    ld de,AMY_FP5_DIV_DEN64
    call AMY_FP5_64_CMP
    jr c,AMY_FP5_DIV_FPA1_FPA2_NEXT
    ld hl,AMY_FP5_DIV_REM64
    ld de,AMY_FP5_DIV_DEN64
    call AMY_FP5_64_SUB
    ld hl,AMY_FP5_DIV_QUO32
    set 0,(hl)
AMY_FP5_DIV_FPA1_FPA2_NEXT:
    ld hl,AMY_FP5_DIV_REM64
    call AMY_FP5_64_SHL1
    pop bc
    djnz AMY_FP5_DIV_FPA1_FPA2_LOOP

    ld hl,AMY_FP5_DIV_REM64
    ld de,AMY_FP5_DIV_DEN64
    call AMY_FP5_64_CMP
    jr c,AMY_FP5_DIV_FPA1_FPA2_NOROUND
    ld hl,AMY_FP5_DIV_QUO32
    call AMY_U32_INC
    ld a,(AMY_FP5_DIV_QUO32+0)
    ld b,a
    ld a,(AMY_FP5_DIV_QUO32+1)
    or b
    ld b,a
    ld a,(AMY_FP5_DIV_QUO32+2)
    or b
    ld b,a
    ld a,(AMY_FP5_DIV_QUO32+3)
    or b
    jr nz,AMY_FP5_DIV_FPA1_FPA2_NOROUND
    xor a
    ld (AMY_FP5_DIV_QUO32+0),a
    ld (AMY_FP5_DIV_QUO32+1),a
    ld (AMY_FP5_DIV_QUO32+2),a
    ld a,$80
    ld (AMY_FP5_DIV_QUO32+3),a
    ld hl,AMY_FP5_DIV_EXP
    inc (hl)

AMY_FP5_DIV_FPA1_FPA2_NOROUND:
    ld a,(AMY_FP5_DIV_QUO32+3)
    bit 7,a
    jr nz,AMY_FP5_DIV_FPA1_FPA2_PACK
    ld hl,AMY_FP5_DIV_EXP
    dec (hl)
    jp z,AMY_FP5_DIV_FPA1_FPA2_ZERO
    ld hl,AMY_FP5_DIV_QUO32
    call AMY_FP5_FMT_SHIFT32_LEFT_HL

AMY_FP5_DIV_FPA1_FPA2_PACK:
    ld a,(AMY_FP5_DIV_QUO32+0)
    ld (AMY_FP5_FPA2+0),a
    ld a,(AMY_FP5_DIV_QUO32+1)
    ld (AMY_FP5_FPA2+1),a
    ld a,(AMY_FP5_DIV_QUO32+2)
    ld (AMY_FP5_FPA2+2),a
    ld a,(AMY_FP5_DIV_QUO32+3)
    and $7F
    ld b,a
    ld a,(AMY_FP5_DIV_SIGN)
    or b
    ld (AMY_FP5_FPA2+3),a
    ld a,(AMY_FP5_DIV_EXP)
    ld (AMY_FP5_FPA2+4),a
    ret

AMY_FP5_DIV_FPA1_FPA2_ZERO:
    ld hl,AMY_FP5_FPA2
    jp AMY_FP5_ZERO_MEM
