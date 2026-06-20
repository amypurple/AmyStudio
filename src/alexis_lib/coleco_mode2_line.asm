; -----------------------------------------------------------------------------
; ALEXIS Mode 2 Bresenham line drawing
; CVBasic-derived. Depends on AMY_MODE2_LINE_PLOT_CURRENT and scratch EQUs.
; -----------------------------------------------------------------------------

AMY_MODE2_LINE_CORE:
    ld a,b
    ld (AMY_MODE2_X1),a
    ld a,c
    ld (AMY_MODE2_Y1),a
    ld a,d
    ld (AMY_MODE2_X2),a
    ld a,e
    ld (AMY_MODE2_Y2),a
    ld a,b
    cp d
    jr z,AMY_MODE2_LINE_CORE_SX_ZERO
    ld a,1
    jr c,AMY_MODE2_LINE_CORE_SX_DONE
    ld a,$FF
    jr AMY_MODE2_LINE_CORE_SX_DONE
AMY_MODE2_LINE_CORE_SX_ZERO:
    xor a
AMY_MODE2_LINE_CORE_SX_DONE:
    ld (AMY_MODE2_SX),a
    ld a,c
    cp e
    jr z,AMY_MODE2_LINE_CORE_SY_ZERO
    ld a,1
    jr c,AMY_MODE2_LINE_CORE_SY_DONE
    ld a,$FF
    jr AMY_MODE2_LINE_CORE_SY_DONE
AMY_MODE2_LINE_CORE_SY_ZERO:
    xor a
AMY_MODE2_LINE_CORE_SY_DONE:
    ld (AMY_MODE2_SY),a
    ld a,d
    sub b
    jr nc,AMY_MODE2_LINE_CORE_DX_DONE
    neg
AMY_MODE2_LINE_CORE_DX_DONE:
    ld (AMY_MODE2_DX),a
    ld a,e
    sub c
    jr nc,AMY_MODE2_LINE_CORE_DY_DONE
    neg
AMY_MODE2_LINE_CORE_DY_DONE:
    ld (AMY_MODE2_DY),a
    ld a,(AMY_MODE2_DX)
    ld b,a
    ld a,(AMY_MODE2_DY)
    cp b
    jr c,AMY_MODE2_LINE_CORE_XMAJOR
    jr z,AMY_MODE2_LINE_CORE_YMAJOR
    jr AMY_MODE2_LINE_CORE_YMAJOR
AMY_MODE2_LINE_CORE_XMAJOR:
    ld a,(AMY_MODE2_DY)
    ld l,a
    ld h,0
    add hl,hl
    ld a,(AMY_MODE2_DX)
    ld e,a
    ld d,0
    or a
    sbc hl,de
    ld (AMY_MODE2_ERR),hl
AMY_MODE2_LINE_CORE_XLOOP:
    call AMY_MODE2_LINE_PLOT_CURRENT
    ld a,(AMY_MODE2_X1)
    ld b,a
    ld a,(AMY_MODE2_X2)
    cp b
    ret z
    ld hl,(AMY_MODE2_ERR)
    bit 7,h
    jr nz,AMY_MODE2_LINE_CORE_XSMALL
    ld a,(AMY_MODE2_DY)
    ld l,a
    ld h,0
    ld a,(AMY_MODE2_DX)
    ld e,a
    ld d,0
    or a
    sbc hl,de
    add hl,hl
    ld (AMY_MODE2_TMP),hl
    ld hl,(AMY_MODE2_ERR)
    ld de,(AMY_MODE2_TMP)
    add hl,de
    ld (AMY_MODE2_ERR),hl
    ld a,(AMY_MODE2_Y1)
    ld b,a
    ld a,(AMY_MODE2_SY)
    add a,b
    ld (AMY_MODE2_Y1),a
    jr AMY_MODE2_LINE_CORE_XSTEP
AMY_MODE2_LINE_CORE_XSMALL:
    ld a,(AMY_MODE2_DY)
    ld l,a
    ld h,0
    add hl,hl
    ld de,(AMY_MODE2_ERR)
    add hl,de
    ld (AMY_MODE2_ERR),hl
AMY_MODE2_LINE_CORE_XSTEP:
    ld a,(AMY_MODE2_X1)
    ld b,a
    ld a,(AMY_MODE2_SX)
    add a,b
    ld (AMY_MODE2_X1),a
    jr AMY_MODE2_LINE_CORE_XLOOP
AMY_MODE2_LINE_CORE_YMAJOR:
    ld a,(AMY_MODE2_DX)
    ld l,a
    ld h,0
    add hl,hl
    ld a,(AMY_MODE2_DY)
    ld e,a
    ld d,0
    or a
    sbc hl,de
    ld (AMY_MODE2_ERR),hl
AMY_MODE2_LINE_CORE_YLOOP:
    call AMY_MODE2_LINE_PLOT_CURRENT
    ld a,(AMY_MODE2_Y1)
    ld b,a
    ld a,(AMY_MODE2_Y2)
    cp b
    ret z
    ld hl,(AMY_MODE2_ERR)
    bit 7,h
    jr nz,AMY_MODE2_LINE_CORE_YSMALL
    ld a,(AMY_MODE2_DX)
    ld l,a
    ld h,0
    ld a,(AMY_MODE2_DY)
    ld e,a
    ld d,0
    or a
    sbc hl,de
    add hl,hl
    ld (AMY_MODE2_TMP),hl
    ld hl,(AMY_MODE2_ERR)
    ld de,(AMY_MODE2_TMP)
    add hl,de
    ld (AMY_MODE2_ERR),hl
    ld a,(AMY_MODE2_X1)
    ld b,a
    ld a,(AMY_MODE2_SX)
    add a,b
    ld (AMY_MODE2_X1),a
    jr AMY_MODE2_LINE_CORE_YSTEP
AMY_MODE2_LINE_CORE_YSMALL:
    ld a,(AMY_MODE2_DX)
    ld l,a
    ld h,0
    add hl,hl
    ld de,(AMY_MODE2_ERR)
    add hl,de
    ld (AMY_MODE2_ERR),hl
AMY_MODE2_LINE_CORE_YSTEP:
    ld a,(AMY_MODE2_Y1)
    ld b,a
    ld a,(AMY_MODE2_SY)
    add a,b
    ld (AMY_MODE2_Y1),a
    jr AMY_MODE2_LINE_CORE_YLOOP

; Input: B=x1, C=y1, D=x2, E=y2.
AMY_MODE2_LINE:
    xor a
    ld (AMY_MODE2_USECOLOR),a
    jp AMY_MODE2_LINE_CORE

; Input: A=color nibble, B=x1, C=y1, D=x2, E=y2.
AMY_MODE2_LINE_COLOR:
    ld (AMY_MODE2_COLOR),a
    ld a,1
    ld (AMY_MODE2_USECOLOR),a
    jp AMY_MODE2_LINE_CORE
