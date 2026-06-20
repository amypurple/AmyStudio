; -----------------------------------------------------------------------------
; ALEXIS sprite mode/config helpers
; -----------------------------------------------------------------------------

; Select 8x8 sprites by clearing the size bit in VDP R1.
AMY_SET_SPRITES8X8:
    ld a,($73C4)
    and $FD
    ld c,a
    ld b,1
    jp WRITE_REGISTER

; Select 16x16 sprites by setting the size bit in VDP R1.
AMY_SET_SPRITES16X16:
    ld a,($73C4)
    or $02
    ld c,a
    ld b,1
    jp WRITE_REGISTER

; Disable sprite zoom.
AMY_SET_SPRITES_SIMPLE:
    ld a,($73C4)
    and $FE
    ld c,a
    ld b,1
    jp WRITE_REGISTER

; Enable sprite zoom (double-sized rendering).
AMY_SET_SPRITES_DOUBLE:
    ld a,($73C4)
    or $01
    ld c,a
    ld b,1
    jp WRITE_REGISTER
