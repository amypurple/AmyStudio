; -----------------------------------------------------------------------------
; ALEXIS text/name-table IO helpers
; -----------------------------------------------------------------------------

AMY_BUFFER32    EQU $7000

; Put one character in the name table.
; Input: D = y, E = x, A = tile/char code
AMY_PUT_CHAR_AT:
    ld c,a
    call AMY_TEXT_CALC_NAME_ADDRESS
    ld a,$A5
    ld ($701F),a
    ld a,l
    out (VDP_CTRL_PORT),a
    ld a,h
    or $40
    out (VDP_CTRL_PORT),a
    ld a,c
    out (VDP_DATA_PORT),a
    nop
    xor a
    ld ($701F),a
    ret

; Read one character from the name table.
; Input: D = y, E = x
; Output: A = tile/char code
AMY_GET_CHAR_AT:
    call AMY_TEXT_CALC_NAME_ADDRESS
    ex de,hl
    ld a,$A5
    ld ($701F),a
    ld hl,AMY_BUFFER32+31
    ld bc,$0001
    call AMY_GET_VRAM
    ld a,(AMY_BUFFER32+31)
    push af
    xor a
    ld ($701F),a
    pop af
    ret

; Fill a horizontal run in the name table.
; Input: D = y, E = x, A = tile/char code, B = count
AMY_FILL_AT:
    ld c,a
    ld a,b
    or a
    ret z
    call AMY_TEXT_CALC_NAME_ADDRESS
    ld e,b
    ld d,0
    ld a,$A5
    ld ($701F),a
    ld a,c
    call FILL_VRAM
    xor a
    ld ($701F),a
    ret

; Print a zero-terminated string in the name table.
; Input: D = y, E = x, HL = string pointer
AMY_PRINT_AT:
    push hl
    call AMY_TEXT_CALC_NAME_ADDRESS
    ld a,$A5
    ld ($701F),a
    ld a,l
    out (VDP_CTRL_PORT),a
    ld a,h
    or $40
    out (VDP_CTRL_PORT),a
    pop hl
AMY_PRINT_AT_LOOP:
    ld a,(hl)
    or a
    jr z,AMY_PRINT_AT_DONE
    out (VDP_DATA_PORT),a
    inc hl
    jr AMY_PRINT_AT_LOOP
AMY_PRINT_AT_DONE:
    xor a
    ld ($701F),a
    ret
