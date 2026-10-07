; Common helper macros for VDP operations

WRITE_VDP_ADDR MACRO addr
    ld a,>addr
    out (VDP_CTRL_PORT),a
    ld a,<addr
    out (VDP_CTRL_PORT),a
ENDM

WRITE_VDP_DATA_BYTES MACRO source,count
    ld hl,source
    ld b,count
.write_loop
    ld a,(hl)
    out (VDP_DATA_PORT),a
    inc hl
    djnz .write_loop
ENDM
