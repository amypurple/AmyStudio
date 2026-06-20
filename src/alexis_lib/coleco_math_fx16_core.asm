; -----------------------------------------------------------------------------
; ALEXIS fixed-point 16.16 core helpers
; 4-byte little-endian layout: bytes 0-1 = fraction, bytes 2-3 = signed integer
; Pointer convention: HL = destination, DE = source (same as AMY_U32_ADD/SUB)
; -----------------------------------------------------------------------------

; Shared scratch staging inside the legacy 32-byte work buffer.
; This routine family is not re-entrant and clobbers AMY_BUFFER32 content.
AMY_FX16_WORK_A      EQU AMY_BUFFER32+0    ; 4 bytes
AMY_FX16_WORK_B      EQU AMY_BUFFER32+4    ; 4 bytes
AMY_FX16_ACC64       EQU AMY_BUFFER32+8    ; 8 bytes
AMY_FX16_MUL64       EQU AMY_BUFFER32+16   ; 8 bytes
AMY_FX16_SIGN        EQU AMY_BUFFER32+24   ; 1 byte
AMY_FX16_SQRT_N      EQU AMY_BUFFER32+0    ; 6 bytes, radicand = value << 16
AMY_FX16_SQRT_RES    EQU AMY_BUFFER32+6    ; 6 bytes, partial/result
AMY_FX16_SQRT_BIT    EQU AMY_BUFFER32+12   ; 6 bytes, trial bit
AMY_FX16_SQRT_TMP    EQU AMY_BUFFER32+18   ; 6 bytes, res + bit

; 16.16 add: destination = destination + source
; Input:  HL = destination pointer, DE = source pointer
; Output: destination updated in place
AMY_FX16_16_ADD:
    jp AMY_U32_ADD

; 16.16 subtract: destination = destination - source
; Input:  HL = destination pointer, DE = source pointer
; Output: destination updated in place
AMY_FX16_16_SUB:
    jp AMY_U32_SUB

; 16.16 negate: negate value in place (two's complement)
; Input:  HL = pointer to 4-byte value
; Output: value negated in place
AMY_FX16_16_NEG:
    push hl
    ld a,(hl)
    cpl
    ld (hl),a
    inc hl
    ld a,(hl)
    cpl
    ld (hl),a
    inc hl
    ld a,(hl)
    cpl
    ld (hl),a
    inc hl
    ld a,(hl)
    cpl
    ld (hl),a
    pop hl
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

; 16.16 absolute value
; Input:  HL = pointer to 4-byte value
; Output: value made non-negative in place
AMY_FX16_16_ABS:
    inc hl
    inc hl
    inc hl
    ld a,(hl)
    dec hl
    dec hl
    dec hl
    bit 7,a
    ret z
    jp AMY_FX16_16_NEG
