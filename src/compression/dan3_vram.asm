; =============================================================================
; DAN3.asm - DAN3 Decompression Routine
; =============================================================================
; LZSS Compression by Amy Bienvenu (2018)
; Z80 decompressor code is required here.
; =============================================================================
; IN: HL -> Source compressed data
;     DE -> Destination VRAM address
; =============================================================================
; Timing note:
; - The offset-copy loop still keeps all NOPs for safety.
; - Amy Bienvenu tested this timing on real ColecoVision
;   hardware while developing the routine, so these delays should be treated as
;   hardware-proven until re-measured.
; - Future optimization candidate: audit the post-IN triple NOP and the two NOPs
;   before OUT ($BE),A with full cycle counts instead of broad optimizer rules.
dan3_decompress:
    call dan3_set_write_addr
    ld a, $80
    push ix
    ld ix, dan3_getbite + 3
dan3_offsetsize_loop:
    dec ix
    dec ix
    dec ix
    call dan3_getbit
    jr c, dan3_offsetsize_loop

dan3_copy_byte:
    ld b, 1
dan3_literal2main:
    ld c, $BE
dan3_literals_loop:
    outi
    inc de
    jr nz, dan3_literals_loop

dan3_main_loop:
    call dan3_getbit
    jr c, dan3_copy_byte

    push de
    ld de, $0001
    ld b, e
dan3_expgolomb_0:
    inc b
    call dan3_getbit
    jr c, dan3_expgolomb_value
    bit 3, b
    jr z, dan3_expgolomb_0

    pop de
    call dan3_getbit
    jr c, dan3_manyliterals
    pop ix
    ret
dan3_manyliterals:
    ld b, (hl)
    inc hl
    inc b
    jr dan3_literal2main

dan3_expgolomb_value:
    dec b
dan3_expgolomb_value_loop:
    call dan3_getbite
    djnz dan3_expgolomb_value_loop
    dec e
    push de
    pop bc
    dec e
    jr z, dan3_offset1

    ld e, d
dan3_offsets:
    call dan3_getbit
    jr nc, dan3_offset3
    call dan3_getbit
    jr nc, dan3_offset2
    call dan3_gethighbitse
    inc e
    ld d, e
dan3_offset3:
    ld e, (hl)
    inc hl
    ex af, af'
    ld a, e
    add a, $20
    ld e, a
    jr nc, dan3_offset3b
    inc d
dan3_offset3b:
    ex af, af'
    jr dan3_copy_from_offset
dan3_offset2:
    call dan3_get5bitse
    jr dan3_copy_from_offset
dan3_offset1:
    call dan3_getbit
    jr nc, dan3_copy_from_offset
    call dan3_getbite
    inc e

dan3_copy_from_offset:
    ex (sp), hl
    push hl
    scf
    sbc hl, de
    pop de
    ex af, af'
    set 6, d
dan3_copybytes_loop:
    push bc
    ld c, $BF
    out (c), l
    nop
    out (c), h
    inc hl
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
    dec bc
    ld a, b
    or c
    jr nz, dan3_copybytes_loop
    res 6, d
    ex af, af'
    pop hl
    jp dan3_main_loop

dan3_gethighbitse:
    jp (ix)
dan3_get5bitse:
    call dan3_getbite
    call dan3_getbite
    call dan3_getbite
    call dan3_getbite
dan3_getbite:
    call dan3_getbit
    rl e
    ret

dan3_getbit:
    add a, a
    ret nz
    ld a, (hl)
    inc hl
    rla
    ret

dan3_set_write_addr:
    ld c, $BF
    out (c), e
    set 6, d
    out (c), d
    res 6, d
    ret
