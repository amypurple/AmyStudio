; -----------------------------------------------------------------------------
; ALEXIS unsigned fixed 8.8 divide helper
; Depends on: coleco_math_u32_div.asm
; -----------------------------------------------------------------------------

AMY_UFX8_8_DIV_LEFT  EQU AMY_BUFFER32+0
AMY_UFX8_8_DIV_RIGHT EQU AMY_BUFFER32+4

; Input:  HL = left, DE = right
; Output: HL = (left << 8) / right. Division by zero returns 0.
AMY_UFX8_8_DIV:
    xor a
    ld (AMY_UFX8_8_DIV_LEFT+0),a
    ld a,l
    ld (AMY_UFX8_8_DIV_LEFT+1),a
    ld a,h
    ld (AMY_UFX8_8_DIV_LEFT+2),a
    xor a
    ld (AMY_UFX8_8_DIV_LEFT+3),a
    ld a,e
    ld (AMY_UFX8_8_DIV_RIGHT+0),a
    ld a,d
    ld (AMY_UFX8_8_DIV_RIGHT+1),a
    xor a
    ld (AMY_UFX8_8_DIV_RIGHT+2),a
    ld (AMY_UFX8_8_DIV_RIGHT+3),a
    ld hl,AMY_UFX8_8_DIV_LEFT
    ld de,AMY_UFX8_8_DIV_RIGHT
    call AMY_U32_DIV
    ld hl,(AMY_UFX8_8_DIV_LEFT+0)
    ret
