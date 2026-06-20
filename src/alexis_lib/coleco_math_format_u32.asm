; -----------------------------------------------------------------------------
; ALEXIS u32 formatting helper
; Depends on: coleco_math_u32_copy.asm (AMY_U32_COPY)
;             coleco_math_u32_sub.asm  (AMY_U32_SUB)
;             coleco_math_compare_u32.asm (AMY_CMP_U32_MEM)
; -----------------------------------------------------------------------------

; Convert a 32-bit little-endian unsigned integer in RAM to ten ASCII digits.
; Input:  HL = pointer to 4-byte source value
;         DE = destination buffer (10 bytes)
; Output: writes exactly 10 ASCII digits, including leading zeros
; Scratch: uses AMY_BUFFER32..AMY_BUFFER32+3 as a working copy
AMY_U32_TO_ASCII10:
    push de
    ex de,hl
    ld hl,AMY_BUFFER32
    call AMY_U32_COPY
    pop de
    ld hl,AMY_U32_TO_ASCII10_PLACES
    ld b,10
AMY_U32_TO_ASCII10_NEXT_DIGIT:
    push bc
    push hl
    ld c,$30
AMY_U32_TO_ASCII10_COUNT_LOOP:
    push de
    push hl
    push hl
    pop de
    ld hl,AMY_BUFFER32
    push bc
    call AMY_CMP_U32_MEM
    pop bc
    pop hl
    pop de
    jr c,AMY_U32_TO_ASCII10_STORE_DIGIT
    push de
    push hl
    push hl
    pop de
    ld hl,AMY_BUFFER32
    push bc
    call AMY_U32_SUB
    pop bc
    pop hl
    pop de
    inc c
    jr AMY_U32_TO_ASCII10_COUNT_LOOP
AMY_U32_TO_ASCII10_STORE_DIGIT:
    ld a,c
    ld (de),a
    inc de
    pop hl
    ld bc,4
    add hl,bc
    pop bc
    djnz AMY_U32_TO_ASCII10_NEXT_DIGIT
    ret

AMY_U32_TO_ASCII10_PLACES:
    db $00,$CA,$9A,$3B
    db $00,$E1,$F5,$05
    db $80,$96,$98,$00
    db $40,$42,$0F,$00
    db $A0,$86,$01,$00
    db $10,$27,$00,$00
    db $E8,$03,$00,$00
    db $64,$00,$00,$00
    db $0A,$00,$00,$00
    db $01,$00,$00,$00
