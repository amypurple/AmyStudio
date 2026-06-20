; -----------------------------------------------------------------------------
; ALEXIS Mode 2 Bresenham circle drawing
; CVBasic-derived. Depends on AMY_MODE2_PLOT_BCMAYBE_COLOR and scratch EQUs.
; -----------------------------------------------------------------------------

AMY_MODE2_CIRCLE_PLOT_POINTS:
    ld a,(AMY_MODE2_CENTERX)
    ld b,a
    ld a,(AMY_MODE2_CIRCLEX)
    add a,b
    jr c,AMY_MODE2_CIRCLE_PLOT_POINTS_2
    ld b,a
    ld a,(AMY_MODE2_CENTERY)
    ld c,a
    ld a,(AMY_MODE2_CIRCLEY)
    add a,c
    cp 192
    jr nc,AMY_MODE2_CIRCLE_PLOT_POINTS_2
    ld c,a
    call AMY_MODE2_PLOT_BCMAYBE_COLOR
AMY_MODE2_CIRCLE_PLOT_POINTS_2:
    ld a,(AMY_MODE2_CENTERX)
    ld b,a
    ld a,(AMY_MODE2_CIRCLEX)
    add a,b
    jr c,AMY_MODE2_CIRCLE_PLOT_POINTS_3
    ld b,a
    ld a,(AMY_MODE2_CENTERY)
    ld c,a
    ld a,(AMY_MODE2_CIRCLEY)
    ld d,a
    ld a,c
    sub d
    jr c,AMY_MODE2_CIRCLE_PLOT_POINTS_4
    ld c,a
    call AMY_MODE2_PLOT_BCMAYBE_COLOR
AMY_MODE2_CIRCLE_PLOT_POINTS_3:
AMY_MODE2_CIRCLE_PLOT_POINTS_4:
    ld a,(AMY_MODE2_CENTERX)
    ld d,a
    ld a,(AMY_MODE2_CIRCLEX)
    ld e,a
    ld a,d
    sub e
    jr c,AMY_MODE2_CIRCLE_PLOT_POINTS_5
    ld b,a
    ld a,(AMY_MODE2_CENTERY)
    ld c,a
    ld a,(AMY_MODE2_CIRCLEY)
    add a,c
    cp 192
    jr nc,AMY_MODE2_CIRCLE_PLOT_POINTS_5
    ld c,a
    call AMY_MODE2_PLOT_BCMAYBE_COLOR
AMY_MODE2_CIRCLE_PLOT_POINTS_5:
    ld a,(AMY_MODE2_CENTERX)
    ld d,a
    ld a,(AMY_MODE2_CIRCLEX)
    ld e,a
    ld a,d
    sub e
    jr c,AMY_MODE2_CIRCLE_PLOT_POINTS_6
    ld b,a
    ld a,(AMY_MODE2_CENTERY)
    ld c,a
    ld a,(AMY_MODE2_CIRCLEY)
    ld d,a
    ld a,c
    sub d
    jr c,AMY_MODE2_CIRCLE_PLOT_POINTS_6
    ld c,a
    call AMY_MODE2_PLOT_BCMAYBE_COLOR
AMY_MODE2_CIRCLE_PLOT_POINTS_6:
    ld a,(AMY_MODE2_CENTERX)
    ld b,a
    ld a,(AMY_MODE2_CIRCLEY)
    add a,b
    jr c,AMY_MODE2_CIRCLE_PLOT_POINTS_7
    ld b,a
    ld a,(AMY_MODE2_CENTERY)
    ld c,a
    ld a,(AMY_MODE2_CIRCLEX)
    add a,c
    cp 192
    jr nc,AMY_MODE2_CIRCLE_PLOT_POINTS_7
    ld c,a
    call AMY_MODE2_PLOT_BCMAYBE_COLOR
AMY_MODE2_CIRCLE_PLOT_POINTS_7:
    ld a,(AMY_MODE2_CENTERX)
    ld b,a
    ld a,(AMY_MODE2_CIRCLEY)
    add a,b
    jr c,AMY_MODE2_CIRCLE_PLOT_POINTS_8
    ld b,a
    ld a,(AMY_MODE2_CENTERY)
    ld c,a
    ld a,(AMY_MODE2_CIRCLEX)
    ld d,a
    ld a,c
    sub d
    jr c,AMY_MODE2_CIRCLE_PLOT_POINTS_8
    ld c,a
    call AMY_MODE2_PLOT_BCMAYBE_COLOR
AMY_MODE2_CIRCLE_PLOT_POINTS_8:
    ld a,(AMY_MODE2_CENTERX)
    ld d,a
    ld a,(AMY_MODE2_CIRCLEY)
    ld e,a
    ld a,d
    sub e
    jr c,AMY_MODE2_CIRCLE_PLOT_POINTS_9
    ld b,a
    ld a,(AMY_MODE2_CENTERY)
    ld c,a
    ld a,(AMY_MODE2_CIRCLEX)
    add a,c
    cp 192
    jr nc,AMY_MODE2_CIRCLE_PLOT_POINTS_9
    ld c,a
    call AMY_MODE2_PLOT_BCMAYBE_COLOR
AMY_MODE2_CIRCLE_PLOT_POINTS_9:
    ld a,(AMY_MODE2_CENTERX)
    ld d,a
    ld a,(AMY_MODE2_CIRCLEY)
    ld e,a
    ld a,d
    sub e
    ret c
    ld b,a
    ld a,(AMY_MODE2_CENTERY)
    ld c,a
    ld a,(AMY_MODE2_CIRCLEX)
    ld d,a
    ld a,c
    sub d
    ret c
    ld c,a
    jp AMY_MODE2_PLOT_BCMAYBE_COLOR

AMY_MODE2_CIRCLE_CORE:
    ld a,b
    ld (AMY_MODE2_CENTERX),a
    ld a,c
    ld (AMY_MODE2_CENTERY),a
    ld a,d
    ld (AMY_MODE2_RADIUS),a
    xor a
    ld (AMY_MODE2_CIRCLEX),a
    ld a,d
    ld (AMY_MODE2_CIRCLEY),a
    ld l,d
    ld h,0
    add hl,hl
    ld de,3
    xor a
    ex de,hl
    sbc hl,de
    ld (AMY_MODE2_ERR),hl
    call AMY_MODE2_CIRCLE_PLOT_POINTS
AMY_MODE2_CIRCLE_CORE_LOOP:
    ld a,(AMY_MODE2_CIRCLEX)
    ld b,a
    ld a,(AMY_MODE2_CIRCLEY)
    cp b
    ret c
    ld hl,(AMY_MODE2_ERR)
    bit 7,h
    jr nz,AMY_MODE2_CIRCLE_CORE_NOTPOS
    ld a,h
    or l
    jr z,AMY_MODE2_CIRCLE_CORE_NOTPOS
    ld a,(AMY_MODE2_CIRCLEY)
    dec a
    ld (AMY_MODE2_CIRCLEY),a
    ld a,(AMY_MODE2_CIRCLEX)
    ld l,a
    ld h,0
    add hl,hl
    add hl,hl
    ld a,(AMY_MODE2_CIRCLEY)
    ld e,a
    ld d,0
    ex de,hl
    add hl,hl
    add hl,hl
    ex de,hl
    xor a
    sbc hl,de
    ld de,10
    add hl,de
    ld de,(AMY_MODE2_ERR)
    add hl,de
    ld (AMY_MODE2_ERR),hl
    jr AMY_MODE2_CIRCLE_CORE_ADVANCE
AMY_MODE2_CIRCLE_CORE_NOTPOS:
    ld a,(AMY_MODE2_CIRCLEX)
    ld l,a
    ld h,0
    add hl,hl
    add hl,hl
    ld de,6
    add hl,de
    ld de,(AMY_MODE2_ERR)
    add hl,de
    ld (AMY_MODE2_ERR),hl
AMY_MODE2_CIRCLE_CORE_ADVANCE:
    ld a,(AMY_MODE2_CIRCLEX)
    inc a
    ld (AMY_MODE2_CIRCLEX),a
    call AMY_MODE2_CIRCLE_PLOT_POINTS
    jr AMY_MODE2_CIRCLE_CORE_LOOP

; Input: B=centerX, C=centerY, D=radius.
AMY_MODE2_CIRCLE:
    xor a
    ld (AMY_MODE2_USECOLOR),a
    jp AMY_MODE2_CIRCLE_CORE

; Input: A=color nibble, B=centerX, C=centerY, D=radius.
AMY_MODE2_CIRCLE_COLOR:
    ld (AMY_MODE2_COLOR),a
    ld a,1
    ld (AMY_MODE2_USECOLOR),a
    jp AMY_MODE2_CIRCLE_CORE
