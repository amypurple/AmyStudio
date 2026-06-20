; -----------------------------------------------------------------------------
; ALEXIS Mode 2 bitmap pixel primitives and plot helpers
; CVBasic-derived. Depends on AMY_VPOKE, AMY_VPEEK, MODE2 scratch EQUs.
; -----------------------------------------------------------------------------

; Input: B=x, C=y. Output: HL=pattern byte address, A=bit mask for that pixel.
AMY_MODE2_CALC_ADDRESS_MASK:
    ld a,c
    and 7
    ld e,a
    ld a,b
    and $F8
    add a,e
    ld e,a
    ld a,c
    srl a
    srl a
    srl a
    ld d,a
    ld a,b
    and 7
    ld l,a
    ld h,0
    ld bc,AMY_MODE2_BIT_TABLE
    add hl,bc
    ld a,(hl)
    ex de,hl
    ret
AMY_MODE2_BIT_TABLE:
    db $80,$40,$20,$10,$08,$04,$02,$01

; Input: B=x, C=y. Sets one pixel in the Mode 2 bitmap surface.
AMY_MODE2_PSET:
    ld a,c
    cp 192
    ret nc
    call AMY_MODE2_CALC_ADDRESS_MASK
    ld b,a
    push bc
    push hl
    call AMY_VPEEK
    pop hl
    pop bc
    or b
    jp AMY_VPOKE

; Input: B=x, C=y. Clears one pixel in the Mode 2 bitmap surface.
AMY_MODE2_PRESET:
    ld a,c
    cp 192
    ret nc
    call AMY_MODE2_CALC_ADDRESS_MASK
    cpl
    ld b,a
    push bc
    push hl
    call AMY_VPEEK
    pop hl
    pop bc
    and b
    jp AMY_VPOKE

; Input: A=color nibble, B=x, C=y. Sets one pixel and writes a row color byte.
AMY_MODE2_PSET_COLOR:
    push af
    ld a,c
    cp 192
    jr c,AMY_MODE2_PSET_COLOR_INRANGE
    pop af
    ret
AMY_MODE2_PSET_COLOR_INRANGE:
    call AMY_MODE2_CALC_ADDRESS_MASK
    ld b,a
    push bc
    push hl
    call AMY_VPEEK
    pop hl
    pop bc
    or b
    call AMY_VPOKE
    ld a,h
    add a,$20
    ld h,a
    pop af
    and $0F
    add a,a
    add a,a
    add a,a
    add a,a
    jp AMY_VPOKE

; Input: HL = signed X, DE = signed Y. Plot only if on-screen.
AMY_MODE2_PLOT_CLIP:
    ld a,h
    or a
    ret nz
    ld a,d
    or a
    ret nz
    ld a,e
    cp 192
    ret nc
    ld b,l
    ld c,e
    jp AMY_MODE2_PSET

; Input: HL = signed X, DE = signed Y, A = color nibble. Plot only if on-screen.
AMY_MODE2_PLOT_COLOR_CLIP:
    push af
    ld a,h
    or a
    jr nz,AMY_MODE2_PLOT_COLOR_CLIP_SKIP
    ld a,d
    or a
    jr nz,AMY_MODE2_PLOT_COLOR_CLIP_SKIP
    ld a,e
    cp 192
    jr nc,AMY_MODE2_PLOT_COLOR_CLIP_SKIP
    ld b,l
    ld c,e
    pop af
    jp AMY_MODE2_PSET_COLOR
AMY_MODE2_PLOT_COLOR_CLIP_SKIP:
    pop af
    ret

; Input: B = X, C = Y. Uses scratch color flag to choose plain or colored plot.
AMY_MODE2_PLOT_BCMAYBE_COLOR:
    ld a,(AMY_MODE2_USECOLOR)
    or a
    jr z,AMY_MODE2_PLOT_BCMAYBE_COLOR_PLAIN
    ld a,(AMY_MODE2_COLOR)
    jp AMY_MODE2_PSET_COLOR
AMY_MODE2_PLOT_BCMAYBE_COLOR_PLAIN:
    jp AMY_MODE2_PSET

AMY_MODE2_LINE_PLOT_CURRENT:
    ld a,(AMY_MODE2_X1)
    ld l,a
    ld h,0
    ld a,(AMY_MODE2_Y1)
    ld e,a
    ld d,0
    ld a,(AMY_MODE2_USECOLOR)
    or a
    jr z,AMY_MODE2_LINE_PLOT_CURRENT_PLAIN
    ld a,(AMY_MODE2_COLOR)
    jp AMY_MODE2_PLOT_COLOR_CLIP
AMY_MODE2_LINE_PLOT_CURRENT_PLAIN:
    jp AMY_MODE2_PLOT_CLIP
