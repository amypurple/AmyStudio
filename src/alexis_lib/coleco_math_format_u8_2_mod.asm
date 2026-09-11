; Convert an unsigned byte modulo 100 to two ASCII digits.
; Input: A = 0..255, DE = destination buffer.
AMY_U8_TO_ASCII2_MOD:
    cp 100
    jr c,AMY_U8_TO_ASCII2_MOD_READY
    sub 100
    jr AMY_U8_TO_ASCII2_MOD
AMY_U8_TO_ASCII2_MOD_READY:
    jp AMY_U8_TO_ASCII2
