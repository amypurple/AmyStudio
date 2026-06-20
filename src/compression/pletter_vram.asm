; =============================================================================
; PLETTER.asm - Pletter Decompression Routine
; =============================================================================
; LZSS Compression by Sander Zuidema (2008)
; Z80 decompressor code is required here.
; =============================================================================
; IN: HL -> Source compressed data
;     DE -> Destination VRAM address
; =============================================================================
; Timing note:
; - The copyback path still keeps all NOPs because it alternates VRAM reads and
;   writes in the tightest part of the routine.
; - Likely next optimization to study: prove whether all three NOPs after the
;   VRAM read are required before retargeting the write address.
pletter_decompress:
    call pletter_set_write_addr
    push ix
    ld a, (hl)
    inc hl
    exx
    ld de, $0000
    push de
    add a, a
    inc a
    rl e
    add a, a
    rl e
    add a, a
    rl e
    rl e
    ld hl, pletter_modes
    add hl, de
    ld e, (hl)
    inc hl
    ld d, (hl)
    push de
    pop ix
    pop de
    ld e, 1
    exx

pletter_literal:
    ld c, $BE
    outi
    inc de
pletter_loop:
    call pletter_getbit
    jr nc, pletter_literal

    exx
    ld h, d
    ld l, e
pletter_getlen:
    call pletter_getbitexx
    jr nc, pletter_lenok
pletter_lus:
    call pletter_getbitexx
    adc hl, hl
    call pletter_getbitexx
    jr nc, pletter_lenok
    call pletter_getbitexx
    adc hl, hl
    jr c, pletter_depack_out
    call pletter_getbitexx
    jr c, pletter_lus
pletter_lenok:
    inc hl
    exx
    ld c, (hl)
    inc hl
    ld b, 0
    bit 7, c
    jr z, pletter_offsok
    jp (ix)

pletter_mode6:
    call pletter_getbitrlb
pletter_mode5:
    call pletter_getbitrlb
pletter_mode4:
    call pletter_getbitrlb
pletter_mode3:
    call pletter_getbitrlb
pletter_mode2:
    call pletter_getbitrlb
    call pletter_getbit
    jr nc, pletter_offsok
    or a
    inc b
    res 7, c
pletter_offsok:
    inc bc
    push hl
    exx
    push hl
    exx
    ld l, e
    ld h, d
    sbc hl, bc
    pop bc
    set 6, d
    ex af, af'

pletter_copybytes_loop:
    push bc
    ld c, $BF
    out (c), l
    nop
    out (c), h
    nop
    nop
    nop
    in a, ($BE)
    nop
    nop
    nop
    out (c), e
    nop
    out (c), d
    inc de
    nop
    nop
    out ($BE), a
    pop bc
    cpi
    jp pe, pletter_copybytes_loop
    res 6, d
    ex af, af'
    pop hl
    jp pletter_loop

pletter_getbitexx:
    add a, a
    ret nz
    exx
    ld a, (hl)
    inc hl
    exx
    rla
    ret

pletter_getbitrlb:
    call pletter_getbit
    rl b
    ret
pletter_getbit:
    add a, a
    ret nz
    ld a, (hl)
    inc hl
    rla
    ret

pletter_depack_out:
    pop ix
    ret

pletter_modes:
    dw pletter_offsok
    dw pletter_mode2
    dw pletter_mode3
    dw pletter_mode4
    dw pletter_mode5
    dw pletter_mode6

pletter_set_write_addr:
    ld c, $BF
    out (c), e
    set 6, d
    out (c), d
    res 6, d
    ret
