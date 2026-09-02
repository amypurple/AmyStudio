; -----------------------------------------------------------------------------
; ZX2 nano decoder to ColecoVision VRAM
; Stream format and parser by Einar Saukas (ZX2, 3-clause BSD).
; HL = compressed source in ROM/RAM, DE = VRAM destination.
; -----------------------------------------------------------------------------

zx2_decompress:
        ld      bc,$ffff
        push    bc
        ld      a,$80

zx2n_literals:
        call    zx2n_elias
        push    bc
        ex      af,af'
        ld      c,$bf
        out     (c),e
        set     6,d
        out     (c),d
        res     6,d
        pop     bc
zx2_lit_loop:
        ld      a,b
        or      c
        jr      z,zx2_lit_done
        ld      a,(hl)
        out     ($be),a
        inc     hl
        inc     de
        dec     bc
        jr      zx2_lit_loop
zx2_lit_done:
        ex      af,af'

        add     a,a
        jr      c,zx2n_new_offset
zx2n_reuse:
        call    zx2n_elias
zx2n_copy:
        ex      (sp),hl
        push    hl
        add     hl,de
        ex      af,af'
        set     6,d

zx2_copy_loop:
        push    bc
        ld      c,$bf
        out     (c),l
        nop
        out     (c),h
        inc     hl
        nop
        nop
        in      a,($be)
        nop
        nop
        nop
        out     (c),e
        nop
        out     (c),d
        inc     de
        nop
        nop
        out     ($be),a
        pop     bc
        dec     bc
        ld      a,b
        or      c
        jr      nz,zx2_copy_loop

        res     6,d
        ex      af,af'
        pop     hl
        ex      (sp),hl
        add     a,a
        jr      nc,zx2n_literals

zx2n_new_offset:
        pop     bc
        ld      c,(hl)
        inc     hl
        inc     c
        ret     z
        push    bc
        call    zx2n_elias
        inc     bc
        jr      zx2n_copy

zx2n_elias:
        ld      bc,1
zx2n_elias_loop:
        add     a,a
        jr      nz,zx2n_elias_skip
        ld      a,(hl)
        inc     hl
        rla
zx2n_elias_skip:
        ret     nc
        add     a,a
        rl      c
        rl      b
        jr      zx2n_elias_loop
