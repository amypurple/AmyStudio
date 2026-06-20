; -----------------------------------------------------------------------------
; ALEXIS fixed-point arithmetic helpers
; -----------------------------------------------------------------------------

; Fixed-point 8.8 add.
; Input:  HL = left, DE = right
; Output: HL = left + right
AMY_FX8_8_ADD:
    add hl,de
    ret

; Fixed-point 8.8 subtract.
; Input:  HL = left, DE = right
; Output: HL = left - right
AMY_FX8_8_SUB:
    or a
    sbc hl,de
    ret
