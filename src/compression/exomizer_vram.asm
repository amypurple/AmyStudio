; Exomizer 2 raw P0 decompressor to TMS9918A VRAM.
; HL = compressed source in ROM/RAM, DE = destination VRAM address.
;
; Adapted from Metalbrain's Exomizer 2 Z80 decoder, optimized by Antonio
; Villena and Urusergi. The format is by Magnus Lind. The original routine
; is distributed with Exomizer under its zlib-style license. Only LDIR's
; literal and match copies are replaced by TMS9918A port operations.

exomizer_decompress:
    ld c,$BF
    out (c),e
    set 6,d
    out (c),d
    res 6,d

    ld iy,AMY_EXOMIZER_TABLE+11
    ld a,(hl)
    inc hl
    ld b,52
    push de
    cp a
exo_initbits:
    ld c,16
    jr nz,exo_get4bits
    ld ixl,c
    ld de,1
exo_get4bits:
    call exo_getbit
    rl c
    jr nc,exo_get4bits
    inc c
    push hl
    ld hl,1
    ld (iy+41),c
exo_setbit:
    dec c
    jr nz,exo_setbit-1
    ld (iy-11),e
    ld (iy+93),d
    add hl,de
    ex de,hl
    inc iy
    pop hl
    dec ixl
    djnz exo_initbits
    pop de
    jr exo_mainloop

exo_literalrun:
    ld e,c
exo_getbits:
    dec b
    ret z
exo_getbits1:
    call exo_getbit
    rl e
    rl d
    jr nc,exo_getbits
    ld b,d
    ld c,e
    pop de
exo_literalcopy:
    push af
exo_literalcopy_loop:
    ld a,(hl)
    inc hl
    out ($BE),a
    inc de
    dec bc
    ld a,b
    or c
    jr nz,exo_literalcopy_loop
    pop af

exo_mainloop:
    inc c
    call exo_getbit
    jr c,exo_literalcopy
    ld c,239
exo_getindex:
    call exo_getbit
    inc c
    jr nc,exo_getindex
    ret z
    push de
    ld d,b
    jp p,exo_literalrun
    ld iy,AMY_EXOMIZER_TABLE-229
    call exo_getpair
    push de
    rlc d
    jr nz,exo_dontgo
    dec e
    ld bc,512+32
    jr z,exo_goforit
    dec e
exo_dontgo:
    ld bc,1024+16
    jr z,exo_goforit
    ld de,0
    ld c,d
exo_goforit:
    call exo_getbits1
    ld iy,AMY_EXOMIZER_TABLE+27
    add iy,de
    call exo_getpair
    pop bc
    ex (sp),hl
    push hl
    sbc hl,de
    pop de
    push af
exo_matchcopy_loop:
    push bc
    ld c,$BF
    out (c),l
    nop
    out (c),h
    inc hl
    nop
    nop
    in a,($BE)
    nop
    nop
    nop
    out (c),e
    nop
    set 6,d
    out (c),d
    inc de
    nop
    nop
    out ($BE),a
    res 6,d
    pop bc
    dec bc
    ld a,b
    or c
    jr nz,exo_matchcopy_loop
    pop af
    pop hl
    jp exo_mainloop

exo_getpair:
    add iy,bc
    ld e,d
    ld b,(iy+41)
    call exo_getbits
    ex de,hl
    ld c,(iy-11)
    ld b,(iy+93)
    add hl,bc
    ex de,hl
    ret

exo_getbit:
    srl a
    ret nz
    ld a,(hl)
    inc hl
    rra
    ret

exomizer_decompress_end:

; AMY_EXOMIZER_TABLE is a conditional 156-byte, 256-byte-aligned allocation.
