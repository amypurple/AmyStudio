; -----------------------------------------------------------------------------
; ALEXIS u32 multiply helper
; Depends on: coleco_math_u32_add.asm
; -----------------------------------------------------------------------------

AMY_U32_MUL_A     EQU AMY_BUFFER32+0
AMY_U32_MUL_B     EQU AMY_BUFFER32+4
AMY_U32_MUL_RESULT EQU AMY_BUFFER32+8
AMY_U32_MUL_COUNT EQU AMY_BUFFER32+12

; Unsigned 32-bit multiply, keeping the low 32 bits.
; Input:  HL = destination pointer
;         DE = source pointer
; Output: destination = destination * source
AMY_U32_MUL:
    push hl
    push de

    ld a,(hl)
    ld (AMY_U32_MUL_A+0),a
    inc hl
    ld a,(hl)
    ld (AMY_U32_MUL_A+1),a
    inc hl
    ld a,(hl)
    ld (AMY_U32_MUL_A+2),a
    inc hl
    ld a,(hl)
    ld (AMY_U32_MUL_A+3),a

    ld a,(de)
    ld (AMY_U32_MUL_B+0),a
    inc de
    ld a,(de)
    ld (AMY_U32_MUL_B+1),a
    inc de
    ld a,(de)
    ld (AMY_U32_MUL_B+2),a
    inc de
    ld a,(de)
    ld (AMY_U32_MUL_B+3),a

    xor a
    ld (AMY_U32_MUL_RESULT+0),a
    ld (AMY_U32_MUL_RESULT+1),a
    ld (AMY_U32_MUL_RESULT+2),a
    ld (AMY_U32_MUL_RESULT+3),a
    ld a,32
    ld (AMY_U32_MUL_COUNT),a

AMY_U32_MUL_LOOP:
    ld a,(AMY_U32_MUL_B+0)
    bit 0,a
    jr z,AMY_U32_MUL_NOADD
    ld hl,AMY_U32_MUL_RESULT
    ld de,AMY_U32_MUL_A
    call AMY_U32_ADD
AMY_U32_MUL_NOADD:
    ld hl,AMY_U32_MUL_A
    sla (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)

    ld hl,AMY_U32_MUL_B+3
    srl (hl)
    dec hl
    rr (hl)
    dec hl
    rr (hl)
    dec hl
    rr (hl)

    ld hl,AMY_U32_MUL_COUNT
    dec (hl)
    jr nz,AMY_U32_MUL_LOOP

    pop de
    pop hl
    ld a,(AMY_U32_MUL_RESULT+0)
    ld (hl),a
    inc hl
    ld a,(AMY_U32_MUL_RESULT+1)
    ld (hl),a
    inc hl
    ld a,(AMY_U32_MUL_RESULT+2)
    ld (hl),a
    inc hl
    ld a,(AMY_U32_MUL_RESULT+3)
    ld (hl),a
    ret
