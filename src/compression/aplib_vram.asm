; aPLib raw-stream decompressor to TMS9918 VRAM.
; HL = compressed source in ROM/RAM, DE = plain VRAM destination ($0000-$3FFF).
;
; Derived from the public-domain SMSlib routine by sverx, itself based on the
; aPPack decompressor by dwedit, utopian, Metalbrain, and Maxim. Adapted for
; Amy Studio and the ColecoVision VDP ports. This compact variant shares one
; bit reader instead of duplicating refill paths. Keep NMI disabled while it
; runs. IX and IY are preserved for a safe return to Amy and Coleco BIOS code.

aplib_decompress:
    push ix
    push iy
    set 6,d
    ld c,$bf
    out (c),e
    out (c),d
    ld a,$80

aplib_emit_raw:
    push af
    ld a,(hl)
    out ($be),a
    pop af
    inc hl
    inc de

aplib_no_pair:
    db $dd
    ld h,1

aplib_loop:
    call aplib_get_bit
    jr nc,aplib_emit_raw
    call aplib_get_bit
    jr nc,aplib_emit_block
    call aplib_get_bit
    jr nc,aplib_small_block
    ld bc,$10

aplib_four_bits_loop:
    call aplib_get_bit
    rl c
    jr nc,aplib_four_bits_loop
    jr nz,aplib_single_offset
    push af
    xor a
    out ($be),a
    pop af
    inc de
    jr aplib_no_pair

aplib_single_offset:
    push hl
    ld h,d
    ld l,e
    or a
    sbc hl,bc
    ld bc,1
    call aplib_vram_copy
    pop hl
    jr aplib_no_pair

aplib_small_block:
    ld c,(hl)
    inc hl
    ex af,af'
    rr c
    jp z,aplib_leave
    ld a,2
    ld b,0
    adc a,b
    push hl
    push bc
    pop iy
    ld h,d
    ld l,e
    sbc hl,bc
    ld c,a
    ex af,af'
    call aplib_vram_copy
    pop hl
    jr aplib_pair_done

aplib_emit_block:
    call aplib_get_var
    dec c
    ex af,af'
    ld a,c
    db $dd
    sub h
    jr z,aplib_reuse_offset
    dec a
    ld b,a
    ld c,(hl)
    inc hl
    push bc
    pop iy
    push bc
    call aplib_get_var_shadow
    ex (sp),hl
    push de
    ex de,hl
    ex af,af'
    ld hl,127
    sbc hl,de
    jr c,aplib_length_far
    inc bc
    inc bc
    jr aplib_length_ready
aplib_length_far:
    ld a,4
    cp d
    jr nc,aplib_length_ready
    inc bc
aplib_length_ready:
    pop hl
    push hl
    or a
    sbc hl,de
    ex af,af'
    pop de
    call aplib_vram_copy
    pop hl
    jr aplib_pair_done

aplib_reuse_offset:
    call aplib_get_var_shadow
    push hl
    push de
    ex de,hl
    push iy
    pop de
    sbc hl,de
    pop de
    call aplib_vram_copy
    pop hl
aplib_pair_done:
    db $dd
    ld h,0
    jp aplib_loop

aplib_get_var_shadow:
    ex af,af'
aplib_get_var:
    ld bc,1
aplib_var_loop:
    call aplib_get_bit
    rl c
    rl b
    call aplib_get_bit
    jr c,aplib_var_loop
    ret

aplib_get_bit:
    add a,a
    ret nz
    ld a,(hl)
    inc hl
    rla
    ret

aplib_vram_copy:
    ex af,af'
    push iy
    push bc
    pop iy
    res 6,h
    ld c,$bf
aplib_copy_loop:
    out (c),l
    out (c),h
    in a,($be)
    out (c),e
    out (c),d
    out ($be),a
    inc hl
    inc de
    dec iy
    db $fd
    ld a,h
    db $fd
    or l
    jr nz,aplib_copy_loop
    pop iy
    ex af,af'
    ret

aplib_leave:
    pop iy
    pop ix
    ret
