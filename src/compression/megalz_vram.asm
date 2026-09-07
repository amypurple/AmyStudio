; -----------------------------------------------------------------------------
; MegaLZ V4 decompressor — to VRAM (TMS9918A/TMS9928A)
; HL = source (compressed in RAM, official DEC40.asm stream, no header)
; DE = destination (VRAM address)
; Uses VDP ports: DATA=0xBE, ADDR=0xBF
;
; Adapted from the official zx-evo MegaLZ package's Z80 depacker (DEC40.asm, (C) fyrex^mhm,
; "spread freely as original archives" license). Its stream grammar was independently
; re-derived and validated against the native MegaLZ.exe compressor on this project's full
; picture corpus (22 files). The two RAM-only instructions in the
; original (LDI for single-byte literal copy, LDIR for the back-reference match copy) are
; replaced here with explicit VDP port sequences, following the same pattern already proven
; correct in src/compression/zx0_vram.asm.
; -----------------------------------------------------------------------------

megalz_decompress:
    ld c,$BF
    out (c),e
    set 6,d
    out (c),d
    res 6,d

    ld a,$80
    ex af,af'
megalz_literal:
    ld a,(hl)
    inc hl
    out ($BE),a
    inc de
megalz_token:
    ld bc,$02FF
megalz_bits:
    ex af,af'
megalz_bit_loop:
    add a,a
    jp nz,megalz_bit_ready
    ld a,(hl)
    inc hl
    rla
megalz_bit_ready:
    rl c
    jp nc,megalz_bit_loop
    ex af,af'
    djnz megalz_kind_2
    ld a,2
    sra c
    jp c,megalz_variable
    inc a
    inc c
    jp z,megalz_length_base4
    ld bc,$033F
    jp megalz_bits
megalz_kind_2:
    djnz megalz_kind_3
    srl c
    jp c,megalz_literal
    inc b
    jp megalz_bits
megalz_kind_6:
    add a,c
megalz_length_base4:
    ld bc,$04FF
    jp megalz_bits
megalz_variable:
    inc c
    jp nz,megalz_read_offset
    ex af,af'
    inc b
megalz_length_loop:
    rr c
    ret c
    rl b
    add a,a
    jp nz,megalz_length_bit_ready
    ld a,(hl)
    inc hl
    rla
megalz_length_bit_ready:
    jp nc,megalz_length_loop
    ex af,af'
    add a,b
    ld b,6
    jp megalz_bits
megalz_kind_3:
    djnz megalz_kind_4
    ld a,1
    jp megalz_prepare_copy
megalz_kind_4:
    djnz megalz_kind_5
    inc c
    jp nz,megalz_read_offset
    ld bc,$051F
    jp megalz_bits
megalz_kind_5:
    djnz megalz_kind_6
    ld b,c
megalz_read_offset:
    ld c,(hl)
    inc hl
megalz_prepare_copy:
    dec b
    push hl
    ld l,c
    ld h,b
    add hl,de
    ld c,a
    ld b,0
    ; --- LDIR (BC bytes, (HL)->(DE)) replaced with a VDP read/write loop ---
    push af
mlz_cpy_loop:
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
    jp nz,mlz_cpy_loop
    pop af
    pop hl
    jp megalz_token
