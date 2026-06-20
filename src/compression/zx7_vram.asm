; =============================================================================
; ZX7.asm - ZX7 Decompression Routine
; =============================================================================
; LZSS Compression by Einar Saukas (2012)
; Z80 decompressor code is required here.
; =============================================================================
; IN: HL -> Source compressed data
;     DE -> Destination VRAM address
; =============================================================================
; Timing note:
; - The VRAM->VRAM copy loop still keeps its full NOP padding for now.
; - There may be room to trim some of the post-IN / post-address-write spacing,
;   but that needs a routine-level timing pass on hardware or trusted emulation.
zx7_decompress:
    call zx7_set_write_addr
    ld a, $80

zx7_copy_byte_loop:
    ld c, $be
    outi
    inc de
zx7_main_loop:
    call getbit
    jr nc, zx7_copy_byte_loop

    push de
    ld bc, $0001
    ld d, b
zx7_len_size_loop:
    inc d
    call getbit
    jr nc, zx7_len_size_loop
    jr zx7_len_value_start

zx7_len_value_loop:
    call getbit
    rl c
    rl b
    jr c, zx7_exit
zx7_len_value_start:
    dec d
    jr nz, zx7_len_value_loop
    inc bc

    ld e, (hl)
    inc hl
    db $cb, $33 ; sll e
    jr nc, zx7_offset_end
    call getbit
    rl d
    call getbit
    rl d
    call getbit
    rl d
    call getbit
    ccf
    jr c, zx7_offset_end
    inc d
zx7_offset_end:
    rr e

    ex (sp), hl
    push hl
    sbc hl, de
    pop de

    ex af, af'
    set 6, d
zx7_copybytes_loop:
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
    jr nz, zx7_copybytes_loop
    res 6, d
    ex af, af'
zx7_exit:
    pop hl
    jp nc, zx7_main_loop
    ret

getbit:
    add a, a
    ret nz
    ld a, (hl)
    inc hl
    rla
    ret

zx7_set_write_addr:
    ld c, $BF
    out (c), e
    set 6, d
    out (c), d
    res 6, d
    ret
