; -----------------------------------------------------------------------------
; ALEXIS ASCII font uploader with style flags
; AMY_UPLOAD_ASCII reads VDP ctrl/data port addresses from BIOS ROM at 0x1D43
; and 0x1D47 (locked addresses — stable across all ColecoVision BIOS revisions),
; and the BIOS font pointer from 0x006A (also a locked address).
; This is deliberate BIOS exploitation, not a workaround.
; -----------------------------------------------------------------------------

; Upload the Coleco BIOS ASCII font with legacy style flags.
; Input: A flags (0=normal, 1=italic, 2=bold, 3=bold+italic).
AMY_LOAD_DEFAULT_ASCII_STYLE:
    ld l,a
    ld h,0
    push hl
    ld hl,($73F8)
    ld bc,$00E8
    add hl,bc
    push hl
    ld h,128-29
    ld l,29
    push hl
    call AMY_UPLOAD_ASCII
    pop bc
    pop bc
    pop bc
    ret

AMY_UPLOAD_ASCII:
    pop de
    pop hl
    exx
    pop de
    ld a,(0x1D43)
    ld c,a
    out (c),e
    set 6,d
    out (c),d
    pop bc
    ld a,c
    push bc
    exx
    push hl
    push hl
    push de
    ld c,h
    ld h,0
    add hl,hl
    add hl,hl
    add hl,hl
    ld de,(0x006A)
    add hl,de
    ld de,-65*8
    add hl,de
    exx
    ld hl,AMY_UPLOAD_ASCII_PROCS
    and 3
    add a,a
    add a,l
    ld l,a
    ld a,0
    adc a,h
    ld h,a
    ld a,(hl)
    inc hl
    ld h,(hl)
    ld l,a
    exx
    ld a,c
    exx
    ld b,a
    exx
    ld a,(0x1D47)
    ld c,a
    exx
AMY_UPLOAD_ASCII_LOOP:
    call AMY_UPLOAD_ASCII_INDIR
    djnz AMY_UPLOAD_ASCII_LOOP
    ret

AMY_UPLOAD_ASCII_NORMAL:
    exx
    ld b,8
AMY_UPLOAD_ASCII_NORMAL_LOOP:
    outi
    nop
    nop
    jp nz,AMY_UPLOAD_ASCII_NORMAL_LOOP
    exx
    ret

AMY_UPLOAD_ASCII_ITALIC:
    exx
    ld b,4
AMY_UPLOAD_ASCII_ITALIC_SHIFT:
    ld a,(hl)
    inc hl
    rrca
    and $7F
    out (c),a
    djnz AMY_UPLOAD_ASCII_ITALIC_SHIFT
    ld b,4
AMY_UPLOAD_ASCII_ITALIC_COPY:
    outi
    nop
    nop
    jp nz,AMY_UPLOAD_ASCII_ITALIC_COPY
    exx
    ret

AMY_UPLOAD_ASCII_BOLD:
    exx
    ld b,8
AMY_UPLOAD_ASCII_BOLD_LOOP:
    ld a,(hl)
    inc hl
    ld d,a
    rrca
    and $7F
    or d
    out (c),a
    djnz AMY_UPLOAD_ASCII_BOLD_LOOP
    exx
    ret

AMY_UPLOAD_ASCII_BOLD_ITALIC:
    exx
    ld b,4
AMY_UPLOAD_ASCII_BOLD_ITALIC_SHIFT:
    ld a,(hl)
    inc hl
    ld d,a
    rrca
    and $7F
    or d
    rrca
    and $7F
    out (c),a
    djnz AMY_UPLOAD_ASCII_BOLD_ITALIC_SHIFT
    ld b,4
AMY_UPLOAD_ASCII_BOLD_ITALIC_COPY:
    ld a,(hl)
    inc hl
    ld d,a
    rrca
    and $7F
    or d
    out (c),a
    djnz AMY_UPLOAD_ASCII_BOLD_ITALIC_COPY
    exx
    ret

AMY_UPLOAD_ASCII_PROCS:
    dw AMY_UPLOAD_ASCII_NORMAL
    dw AMY_UPLOAD_ASCII_ITALIC
    dw AMY_UPLOAD_ASCII_BOLD
    dw AMY_UPLOAD_ASCII_BOLD_ITALIC

AMY_UPLOAD_ASCII_INDIR:
    jp (hl)
