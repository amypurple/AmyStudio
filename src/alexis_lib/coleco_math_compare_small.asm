; -----------------------------------------------------------------------------
; ALEXIS small value compare helpers (u8, s8, u16, s16)
; -----------------------------------------------------------------------------

; Compare two unsigned bytes.
; Input:  A = left, B = right
; Output: flags from A-B
AMY_CMP_U8:
    cp b
    ret

; Compare two signed bytes.
; Input:  A = left, B = right
; Output: flags from signed compare
AMY_CMP_S8:
    xor $80
    ld c,a
    ld a,b
    xor $80
    ld b,a
    ld a,c
    cp b
    ret

; Compare two unsigned 16-bit values.
; Input:  HL = left, DE = right
; Output: flags from HL-DE
AMY_CMP_U16:
    or a
    sbc hl,de
    ret

; Compare two signed 16-bit values.
; Input:  HL = left, DE = right
; Output: flags from signed compare
AMY_CMP_S16:
    ld a,h
    xor $80
    ld h,a
    ld a,d
    xor $80
    ld d,a
    or a
    sbc hl,de
    ret
