; aPLib raw-stream decompressor to TMS9918 VRAM.
; HL = compressed source in ROM/RAM, DE = plain VRAM destination ($0000-$3FFF).
;
; Derived from the public-domain SMSlib routine by sverx, itself based on the
; aPPack decompressor by dwedit, utopian, Metalbrain, and Maxim. Adapted for
; Amy Studio and the ColecoVision VDP ports. Keep NMI disabled while it runs.

aplib_decompress:
    push ix
    set 6,d
    ld c,$bf
    di
    out (c),e
    out (c),d
    ei
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
    add a,a
    jr z,aplib_bit1
    jr nc,aplib_emit_raw
aplib_bit1_set:
    add a,a
    jr z,aplib_bit2
    jr nc,aplib_emit_block
aplib_bit2_set:
    add a,a
    jr z,aplib_bit3
    jr nc,aplib_small_block
aplib_bit3_set:
    ld bc,$10

aplib_four_bits_loop:
    add a,a
    jr z,aplib_four_bits
aplib_four_bits_done:
    rl c
    jp nc,aplib_four_bits_loop
    jr nz,aplib_single_offset
    ex de,hl
    ld c,$be
    out (c),b
    ex de,hl
    inc de
    jp aplib_no_pair

aplib_bit1:
    ld a,(hl)
    inc hl
    rla
    jr c,aplib_bit1_set
    jp aplib_emit_raw

aplib_four_bits:
    ld a,(hl)
    inc hl
    rla
    jp aplib_four_bits_done

aplib_single_offset:
    ex af,af'
    ex de,hl
    push hl
    or a
    sbc hl,bc
    res 6,h
    ld c,$bf
    di
    out (c),l
    out (c),h
    ei
    in a,($be)
    pop hl
    di
    out (c),l
    out (c),h
    ei
    out ($be),a
    ex de,hl
    ex af,af'
    inc de
    jp aplib_no_pair

aplib_bit3:
    ld a,(hl)
    inc hl
    rla
    jr c,aplib_bit3_set

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
    db $dd
    ld h,b
    jp aplib_loop

aplib_bit2:
    ld a,(hl)
    inc hl
    rla
    jr c,aplib_bit2_set

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
    jp aplib_length_ready
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
    db $dd
    ld h,b
    jp aplib_loop

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
    db $dd
    ld h,b
    jp aplib_loop

aplib_var_bit1:
    ld a,(hl)
    inc hl
    rla
    jp aplib_var_bit1_done
aplib_var_flag1:
    ld a,(hl)
    inc hl
    rla
    jp aplib_var_flag1_done
aplib_var_bit2:
    ld a,(hl)
    inc hl
    rla
    jp aplib_var_bit2_done
aplib_var_flag2:
    ld a,(hl)
    inc hl
    rla
    jp aplib_var_flag2_done
aplib_var_bit:
    ld a,(hl)
    inc hl
    rla
    jp aplib_var_bit_done
aplib_var_flag:
    ld a,(hl)
    inc hl
    rla
    ret nc
    jp aplib_var_loop

aplib_get_var_shadow:
    ex af,af'
aplib_get_var:
    ld bc,1
    add a,a
    jr z,aplib_var_bit1
aplib_var_bit1_done:
    rl c
    add a,a
    jr z,aplib_var_flag1
aplib_var_flag1_done:
    ret nc
    add a,a
    jr z,aplib_var_bit2
aplib_var_bit2_done:
    rl c
    add a,a
    jr z,aplib_var_flag2
aplib_var_flag2_done:
    ret nc
aplib_var_loop:
    add a,a
    jr z,aplib_var_bit
aplib_var_bit_done:
    rl c
    rl b
    add a,a
    jr z,aplib_var_flag
aplib_var_flag_done:
    ret nc
    jp aplib_var_loop

aplib_vram_copy:
    ex af,af'
    res 6,h
    ld a,b
    or a
    jr z,aplib_copy_tail
aplib_copy_pages:
    push bc
    ld c,$bf
    ld b,0
    call aplib_copy_loop
    pop bc
    djnz aplib_copy_pages
aplib_copy_tail:
    ld b,c
    ld c,$bf
aplib_copy_loop:
    di
    out (c),l
    out (c),h
    in a,($be)
    out (c),e
    out (c),d
    ei
    out ($be),a
    inc hl
    inc de
    djnz aplib_copy_loop
    ex af,af'
    ret

aplib_leave:
    pop ix
    ret
