; -----------------------------------------------------------------------------
; ALEXIS fixed-point 16.16 multiply helper
; Depends on: coleco_math_fx16_core.asm        (scratch aliases, AMY_FX16_16_NEG)
;             coleco_math_fx16_mul_helpers.asm (AMY_U16_MUL32_TO_TMP)
;             coleco_math_u32_add.asm          (AMY_U32_ADD)
; -----------------------------------------------------------------------------

; 16.16 multiply: destination = destination * source
; Input:  HL = pointer to left operand (4 bytes)
;         DE = pointer to right operand (4 bytes)
; Output: left operand updated with product
; Notes:
;   - multiplies signed 16.16 operands
;   - computes a full unsigned 64-bit product, then keeps the middle 32 bits
;     (equivalent to arithmetic >> 16 on the absolute product)
;   - uses AMY_BUFFER32 scratch space
AMY_FX16_16_MULT:
    push hl
    push de

    ld a,(hl)
    ld (AMY_FX16_WORK_A+0),a
    inc hl
    ld a,(hl)
    ld (AMY_FX16_WORK_A+1),a
    inc hl
    ld a,(hl)
    ld (AMY_FX16_WORK_A+2),a
    inc hl
    ld a,(hl)
    ld (AMY_FX16_WORK_A+3),a

    ld a,(de)
    ld (AMY_FX16_WORK_B+0),a
    inc de
    ld a,(de)
    ld (AMY_FX16_WORK_B+1),a
    inc de
    ld a,(de)
    ld (AMY_FX16_WORK_B+2),a
    inc de
    ld a,(de)
    ld (AMY_FX16_WORK_B+3),a

    xor a
    ld (AMY_FX16_SIGN),a

    ld a,(AMY_FX16_WORK_A+3)
    bit 7,a
    jr z,AMY_FX16_16_MULT_CHECK_RIGHT
    ld a,1
    ld (AMY_FX16_SIGN),a
    ld hl,AMY_FX16_WORK_A
    call AMY_FX16_16_NEG

AMY_FX16_16_MULT_CHECK_RIGHT:
    ld a,(AMY_FX16_WORK_B+3)
    bit 7,a
    jr z,AMY_FX16_16_MULT_PREP
    ld hl,AMY_FX16_SIGN
    ld a,(hl)
    xor 1
    ld (hl),a
    ; Keep the full reload: low-byte-only reloads assembled but broke runtime formatting.
    ld hl,AMY_FX16_WORK_B
    call AMY_FX16_16_NEG

AMY_FX16_16_MULT_PREP:
    ld hl,AMY_FX16_ACC64
    xor a
    ld b,4
AMY_FX16_16_MULT_CLEAR:
    ld (hl),a
    inc hl
    djnz AMY_FX16_16_MULT_CLEAR

    ld hl,(AMY_FX16_WORK_A+0)
    ld de,(AMY_FX16_WORK_B+0)
    call AMY_U16_MUL32_TO_TMP
    ld a,(AMY_FX16_MUL64+2)
    ld (AMY_FX16_ACC64+0),a
    ld a,(AMY_FX16_MUL64+3)
    ld (AMY_FX16_ACC64+1),a
    ld a,(AMY_FX16_MUL64+1)
    and $80
    jr z,AMY_FX16_16_MULT_NO_ROUND
    ld hl,AMY_FX16_ACC64
    inc (hl)
    jr nz,AMY_FX16_16_MULT_NO_ROUND
    inc hl
    inc (hl)
AMY_FX16_16_MULT_NO_ROUND:

    ld hl,(AMY_FX16_WORK_A+0)
    ld de,(AMY_FX16_WORK_B+2)
    call AMY_U16_MUL32_TO_TMP
    ld hl,AMY_FX16_ACC64
    ld de,AMY_FX16_MUL64
    call AMY_U32_ADD

    ld hl,(AMY_FX16_WORK_A+2)
    ld de,(AMY_FX16_WORK_B+0)
    call AMY_U16_MUL32_TO_TMP
    ld hl,AMY_FX16_ACC64
    ld de,AMY_FX16_MUL64
    call AMY_U32_ADD

    ld hl,(AMY_FX16_WORK_A+2)
    ld de,(AMY_FX16_WORK_B+2)
    call AMY_U16_MUL32_TO_TMP
    xor a
    ld (AMY_FX16_WORK_A+0),a
    ld (AMY_FX16_WORK_A+1),a
    ld a,(AMY_FX16_MUL64+0)
    ld (AMY_FX16_WORK_A+2),a
    ld a,(AMY_FX16_MUL64+1)
    ld (AMY_FX16_WORK_A+3),a
    ld hl,AMY_FX16_ACC64
    ld de,AMY_FX16_WORK_A
    call AMY_U32_ADD

    pop de
    pop hl
    push hl
    ld de,AMY_FX16_ACC64
    ld a,(de)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    ld (hl),a
    pop hl

    ld a,(AMY_FX16_SIGN)
    or a
    ret z
    jp AMY_FX16_16_NEG
