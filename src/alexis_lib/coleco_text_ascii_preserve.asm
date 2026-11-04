; Load the stock OS7 font without allowing its internal IX/IY pointers to
; corrupt an Amy routine's stack frame.
AMY_LOAD_ASCII_PRESERVE_INDEX:
    push ix
    push iy
    call LOAD_ASCII
    pop iy
    pop ix
    ret
