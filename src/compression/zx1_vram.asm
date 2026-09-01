; -----------------------------------------------------------------------------
; ZX1 standard decoder to ColecoVision VRAM
; Stream format and parser by Einar Saukas (ZX1, 3-clause BSD).
; HL = compressed source in ROM/RAM, DE = VRAM destination.
; -----------------------------------------------------------------------------

zx1_decompress:
        ld      bc,$ffff
        push    bc
        ld      a,$80

zx1s_literals:
        call    zx1s_elias
        push    bc
        ex      af,af'
        ld      c,$bf
        out     (c),e
        set     6,d
        out     (c),d
        res     6,d
        pop     bc
        ld      a,c
        ld      c,b
        inc     c
        ld      b,a
zx1_lit_outer:
        push    bc
        ld      c,$be
zx1_lit_inner:
        outi
        inc     de
        jr      nz,zx1_lit_inner
        pop     bc
        dec     c
        jr      nz,zx1_lit_outer
        ld      bc,0                    ; LDIR-compatible postcondition required by ZX1 offset parsing
        ex      af,af'

        add     a,a
        jr      c,zx1s_new_offset
        call    zx1s_elias

zx1s_copy:
        ex      (sp),hl
        push    hl
        add     hl,de
        ex      af,af'
        set     6,d

zx1_copy_loop:
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
        jr      nz,zx1_copy_loop

        res     6,d
        ex      af,af'
        pop     hl
        ex      (sp),hl
        add     a,a
        jr      nc,zx1s_literals

zx1s_new_offset:
        inc     sp
        inc     sp
        dec     b
        ld      c,(hl)
        inc     hl
        rr      c
        jr      nc,zx1s_msb_skip
        ld      b,(hl)
        inc     hl
        rr      b
        inc     b
        ret     z
        rl      c
zx1s_msb_skip:
        push    bc
        call    zx1s_elias
        inc     bc
        jr      zx1s_copy

zx1s_elias:
        ld      bc,1
zx1s_elias_loop:
        add     a,a
        jr      nz,zx1s_elias_skip
        ld      a,(hl)
        inc     hl
        rla
zx1s_elias_skip:
        ret     nc
        add     a,a
        rl      c
        rl      b
        jr      zx1s_elias_loop
