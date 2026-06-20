; -----------------------------------------------------------------------------
; ALEXIS u32 divide helper
; Depends on: coleco_math_u32_sub.asm, coleco_math_compare_u32.asm
; -----------------------------------------------------------------------------

AMY_U32_DIV_DIVIDEND EQU AMY_BUFFER32+0
AMY_U32_DIV_DIVISOR  EQU AMY_BUFFER32+4
AMY_U32_DIV_QUOTIENT EQU AMY_BUFFER32+8
AMY_U32_DIV_REM      EQU AMY_BUFFER32+12
AMY_U32_DIV_COUNT    EQU AMY_BUFFER32+16

; Unsigned 32-bit divide.
; Input:  HL = destination pointer (dividend)
;         DE = source pointer (divisor)
; Output: destination = destination / source. Division by zero stores 0.
AMY_U32_DIV:
    push hl
    push de

    ld a,(hl)
    ld (AMY_U32_DIV_DIVIDEND+0),a
    inc hl
    ld a,(hl)
    ld (AMY_U32_DIV_DIVIDEND+1),a
    inc hl
    ld a,(hl)
    ld (AMY_U32_DIV_DIVIDEND+2),a
    inc hl
    ld a,(hl)
    ld (AMY_U32_DIV_DIVIDEND+3),a

    ld a,(de)
    ld (AMY_U32_DIV_DIVISOR+0),a
    ld b,a
    inc de
    ld a,(de)
    ld (AMY_U32_DIV_DIVISOR+1),a
    or b
    ld b,a
    inc de
    ld a,(de)
    ld (AMY_U32_DIV_DIVISOR+2),a
    or b
    ld b,a
    inc de
    ld a,(de)
    ld (AMY_U32_DIV_DIVISOR+3),a
    or b
    jr nz,AMY_U32_DIV_NONZERO

    xor a
    ld (AMY_U32_DIV_QUOTIENT+0),a
    ld (AMY_U32_DIV_QUOTIENT+1),a
    ld (AMY_U32_DIV_QUOTIENT+2),a
    ld (AMY_U32_DIV_QUOTIENT+3),a
    jr AMY_U32_DIV_STORE

AMY_U32_DIV_NONZERO:
    xor a
    ld (AMY_U32_DIV_QUOTIENT+0),a
    ld (AMY_U32_DIV_QUOTIENT+1),a
    ld (AMY_U32_DIV_QUOTIENT+2),a
    ld (AMY_U32_DIV_QUOTIENT+3),a
    ld (AMY_U32_DIV_REM+0),a
    ld (AMY_U32_DIV_REM+1),a
    ld (AMY_U32_DIV_REM+2),a
    ld (AMY_U32_DIV_REM+3),a
    ld a,32
    ld (AMY_U32_DIV_COUNT),a

AMY_U32_DIV_LOOP:
    ld hl,AMY_U32_DIV_DIVIDEND
    sla (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)

    ld hl,AMY_U32_DIV_REM
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)

    ld hl,AMY_U32_DIV_QUOTIENT
    sla (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)

    ld hl,AMY_U32_DIV_REM
    ld de,AMY_U32_DIV_DIVISOR
    call AMY_CMP_U32_MEM
    jr c,AMY_U32_DIV_NEXT
    ld hl,AMY_U32_DIV_REM
    ld de,AMY_U32_DIV_DIVISOR
    call AMY_U32_SUB
    ld hl,AMY_U32_DIV_QUOTIENT
    ld a,(hl)
    or 1
    ld (hl),a

AMY_U32_DIV_NEXT:
    ld hl,AMY_U32_DIV_COUNT
    dec (hl)
    jr nz,AMY_U32_DIV_LOOP

AMY_U32_DIV_STORE:
    pop de
    pop hl
    ld a,(AMY_U32_DIV_QUOTIENT+0)
    ld (hl),a
    inc hl
    ld a,(AMY_U32_DIV_QUOTIENT+1)
    ld (hl),a
    inc hl
    ld a,(AMY_U32_DIV_QUOTIENT+2)
    ld (hl),a
    inc hl
    ld a,(AMY_U32_DIV_QUOTIENT+3)
    ld (hl),a
    ret
