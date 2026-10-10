; -----------------------------------------------------------------------------
; MSC1 decompressor - direct to TMS9918A VRAM
; HL = source MSC1 stream in ROM/RAM
; DE = destination VRAM address
;
; MSC1 repeat commands point to four literal bytes in the compressed stream,
; so matches never require slow VRAM reads. The VDP write address is selected
; once and the data port auto-increments for the complete output.
; -----------------------------------------------------------------------------

msc1_decompress:
    ld c,$BF
    out (c),e
    set 6,d
    out (c),d
    ld c,$BE

msc1_next:
    ld a,(hl)
    inc hl
    or a
    ret z
    bit 7,a
    jr nz,msc1_repeat

    ld b,a
msc1_literal_loop:
    outi
    jr nz,msc1_literal_loop
    jr msc1_next

msc1_repeat:
    ld d,a
    and $7C
    rrca
    rrca
    jr nz,msc1_repeat_count_ready
    ld a,32
msc1_repeat_count_ready:
    ld b,a
    ld a,d
    and $03
    ld d,a
    ld e,(hl)
    inc hl
    push hl
    or a
    sbc hl,de
msc1_repeat_loop:
    ld a,(hl)
    out (c),a
    inc hl
    ld a,(hl)
    out (c),a
    inc hl
    ld a,(hl)
    out (c),a
    inc hl
    ld a,(hl)
    out (c),a
    dec hl
    dec hl
    dec hl
    djnz msc1_repeat_loop
    pop hl
    jr msc1_next
