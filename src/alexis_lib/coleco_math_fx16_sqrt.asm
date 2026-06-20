; -----------------------------------------------------------------------------
; ALEXIS fixed-point 16.16 sqrt helpers
; Depends on: coleco_math_fx16_core.asm (scratch aliases)
;             coleco_math_u32_zero.asm  (AMY_U32_ZERO)
; -----------------------------------------------------------------------------

; 16.16 square root: value = sqrt(value)
; Input:  HL = pointer to 4-byte signed 16.16 value
; Output: value overwritten with its non-negative 16.16 square root
; Notes:
;   - negative inputs clamp to 0
;   - computes floor(sqrt(value << 16)) using a restoring 48-bit integer sqrt
;   - keeps full fractional fixed32 behavior instead of truncating to whole inputs
AMY_FX16_16_SQRT:
    push hl
    inc hl
    inc hl
    inc hl
    bit 7,(hl)
    jr z,AMY_FX16_16_SQRT_PREP
    pop hl
    jp AMY_U32_ZERO
AMY_FX16_16_SQRT_PREP:
    pop hl
    push hl
    xor a
    ld hl,AMY_FX16_SQRT_N
    ld b,24
AMY_FX16_16_SQRT_CLEAR:
    ld (hl),a
    inc hl
    djnz AMY_FX16_16_SQRT_CLEAR

    pop hl
    push hl
    ld a,(hl)
    ld (AMY_FX16_SQRT_N+2),a
    inc hl
    ld a,(hl)
    ld (AMY_FX16_SQRT_N+3),a
    inc hl
    ld a,(hl)
    ld (AMY_FX16_SQRT_N+4),a
    inc hl
    ld a,(hl)
    ld (AMY_FX16_SQRT_N+5),a

    ld a,$40
    ld (AMY_FX16_SQRT_BIT+5),a

AMY_FX16_16_SQRT_ALIGN_BIT:
    ld hl,AMY_FX16_SQRT_BIT
    ld de,AMY_FX16_SQRT_N
    call AMY_FX16_48_CMP
    jr c,AMY_FX16_16_SQRT_LOOP
    jr z,AMY_FX16_16_SQRT_LOOP
    ld hl,AMY_FX16_SQRT_BIT
    call AMY_FX16_48_SHR2
    jr AMY_FX16_16_SQRT_ALIGN_BIT

AMY_FX16_16_SQRT_LOOP:
    ld hl,AMY_FX16_SQRT_BIT
    call AMY_FX16_48_IS_ZERO
    jr z,AMY_FX16_16_SQRT_DONE

    ld hl,AMY_FX16_SQRT_TMP
    ld de,AMY_FX16_SQRT_RES
    call AMY_FX16_48_COPY
    ld hl,AMY_FX16_SQRT_TMP
    ld de,AMY_FX16_SQRT_BIT
    call AMY_FX16_48_ADD

    ld hl,AMY_FX16_SQRT_N
    ld de,AMY_FX16_SQRT_TMP
    call AMY_FX16_48_CMP
    jr c,AMY_FX16_16_SQRT_NO_SUB

    ld hl,AMY_FX16_SQRT_N
    ld de,AMY_FX16_SQRT_TMP
    call AMY_FX16_48_SUB
    ld hl,AMY_FX16_SQRT_RES
    call AMY_FX16_48_SHR1
    ld hl,AMY_FX16_SQRT_RES
    ld de,AMY_FX16_SQRT_BIT
    call AMY_FX16_48_ADD
    jr AMY_FX16_16_SQRT_NEXT

AMY_FX16_16_SQRT_NO_SUB:
    ld hl,AMY_FX16_SQRT_RES
    call AMY_FX16_48_SHR1

AMY_FX16_16_SQRT_NEXT:
    ld hl,AMY_FX16_SQRT_BIT
    call AMY_FX16_48_SHR2
    jr AMY_FX16_16_SQRT_LOOP

AMY_FX16_16_SQRT_DONE:
    ; Round to nearest instead of always flooring:
    ; round up when 2*remainder >= 2*root + 1
    ld hl,AMY_FX16_SQRT_TMP
    ld de,AMY_FX16_SQRT_N
    call AMY_FX16_48_COPY
    ld hl,AMY_FX16_SQRT_TMP
    call AMY_FX16_48_SHL1

    ld hl,AMY_FX16_SQRT_BIT
    ld de,AMY_FX16_SQRT_RES
    call AMY_FX16_48_COPY
    ld hl,AMY_FX16_SQRT_BIT
    call AMY_FX16_48_SHL1
    ld hl,AMY_FX16_SQRT_BIT
    call AMY_FX16_48_INC

    ld hl,AMY_FX16_SQRT_TMP
    ld de,AMY_FX16_SQRT_BIT
    call AMY_FX16_48_CMP
    jr c,AMY_FX16_16_SQRT_STORE
    ld hl,AMY_FX16_SQRT_RES
    call AMY_FX16_48_INC

AMY_FX16_16_SQRT_STORE:
    pop hl
    ld a,(AMY_FX16_SQRT_RES+0)
    ld (hl),a
    inc hl
    ld a,(AMY_FX16_SQRT_RES+1)
    ld (hl),a
    inc hl
    ld a,(AMY_FX16_SQRT_RES+2)
    ld (hl),a
    inc hl
    ld a,(AMY_FX16_SQRT_RES+3)
    ld (hl),a
    ret

; Compare two 48-bit unsigned little-endian integers in RAM.
; Input:  HL = left pointer, DE = right pointer
; Output: flags from left-right using the first differing byte from MSB to LSB
AMY_FX16_48_CMP:
    push hl
    push de
    ld bc,5
    add hl,bc
    ex de,hl
    add hl,bc
    ex de,hl
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    cp b
    jr nz,AMY_FX16_48_CMP_DONE
    dec hl
    dec de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    cp b
    jr nz,AMY_FX16_48_CMP_DONE
    dec hl
    dec de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    cp b
    jr nz,AMY_FX16_48_CMP_DONE
    dec hl
    dec de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    cp b
    jr nz,AMY_FX16_48_CMP_DONE
    dec hl
    dec de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    cp b
    jr nz,AMY_FX16_48_CMP_DONE
    dec hl
    dec de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    cp b
AMY_FX16_48_CMP_DONE:
    pop de
    pop hl
    ret

; Copy one 48-bit little-endian integer to another.
; Input:  HL = destination pointer, DE = source pointer
AMY_FX16_48_COPY:
    ex de,hl
    ld bc,6
    ldir
    ret

; Add one 48-bit little-endian integer to another.
; Input: HL = destination pointer, DE = source pointer
AMY_FX16_48_ADD:
    push hl
    push de
    ld a,(de)
    add a,(hl)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    adc a,(hl)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    adc a,(hl)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    adc a,(hl)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    adc a,(hl)
    ld (hl),a
    inc de
    inc hl
    ld a,(de)
    adc a,(hl)
    ld (hl),a
    pop de
    pop hl
    ret

; Subtract one 48-bit little-endian integer from another.
; Input: HL = destination pointer, DE = source pointer
; Output: destination = destination - source
AMY_FX16_48_SUB:
    push hl
    push de
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    sub b
    ld (hl),a
    inc de
    inc hl
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    sbc a,b
    ld (hl),a
    inc de
    inc hl
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    sbc a,b
    ld (hl),a
    inc de
    inc hl
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    sbc a,b
    ld (hl),a
    inc de
    inc hl
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    sbc a,b
    ld (hl),a
    inc de
    inc hl
    ld a,(hl)
    ld c,a
    ld a,(de)
    ld b,a
    ld a,c
    sbc a,b
    ld (hl),a
    pop de
    pop hl
    ret

; Shift a 48-bit little-endian integer right by 1 bit in place.
; Input: HL = pointer to 6-byte value
AMY_FX16_48_SHR1:
    ld de,5
    add hl,de
    ld bc,$0600
AMY_FX16_48_SHR1_LOOP:
    ld a,(hl)
    ld e,a
    srl a
    or c
    ld (hl),a
    ld a,e
    and 1
    add a,a
    add a,a
    add a,a
    add a,a
    add a,a
    add a,a
    add a,a
    ld c,a
    dec hl
    djnz AMY_FX16_48_SHR1_LOOP
    ret

; Shift a 48-bit little-endian integer right by 2 bits in place.
; Input: HL = pointer to 6-byte value
AMY_FX16_48_SHR2:
    ld de,5
    add hl,de
    ld bc,$0600
AMY_FX16_48_SHR2_LOOP:
    ld a,(hl)
    ld e,a
    srl a
    srl a
    or c
    ld (hl),a
    ld a,e
    and 3
    add a,a
    add a,a
    add a,a
    add a,a
    add a,a
    add a,a
    ld c,a
    dec hl
    djnz AMY_FX16_48_SHR2_LOOP
    ret

; Shift a 48-bit little-endian integer left by 1 bit in place.
; Input: HL = pointer to 6-byte value
AMY_FX16_48_SHL1:
    sla (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    inc hl
    rl (hl)
    ret

; Increment a 48-bit little-endian integer in place.
; Input: HL = pointer to 6-byte value
AMY_FX16_48_INC:
    inc (hl)
    ret nz
    inc hl
    inc (hl)
    ret nz
    inc hl
    inc (hl)
    ret nz
    inc hl
    inc (hl)
    ret nz
    inc hl
    inc (hl)
    ret nz
    inc hl
    inc (hl)
    ret

; Test whether a 48-bit little-endian integer is zero.
; Input: HL = pointer to 6-byte value
; Output: Z set when all six bytes are zero
AMY_FX16_48_IS_ZERO:
    ld a,(hl)
    inc hl
    or (hl)
    inc hl
    or (hl)
    inc hl
    or (hl)
    inc hl
    or (hl)
    inc hl
    or (hl)
    ret
