; Convert an unsigned byte modulo 10 to one ASCII digit.
; Input: A = 0..255, DE = destination buffer.
AMY_U8_TO_ASCII1_MOD:
    cp 100
    jr c,AMY_U8_TO_ASCII1_MOD_TENS
    sub 100
    jr AMY_U8_TO_ASCII1_MOD
AMY_U8_TO_ASCII1_MOD_TENS:
    cp 10
    jr c,AMY_U8_TO_ASCII1_MOD_DONE
    sub 10
    jr AMY_U8_TO_ASCII1_MOD
AMY_U8_TO_ASCII1_MOD_DONE:
    add a,$30
    ld (de),a
    ret
