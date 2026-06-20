; -----------------------------------------------------------------------------
; ALEXIS bitmap wipe animations for mode 2 bitmap pictures.
; These clear the COLOR table a pixel-row at a time, matching the old getput11
; wipe_off_up/down behavior. They are intentionally separate from text wipes,
; which blank the NAME table rows instead.
; -----------------------------------------------------------------------------

; Clear bitmap COLOR bytes from bottom to top, one pixel-row per frame.
AMY_WIPE_BITMAP_UP:
    ld hl,($73FA)
    ld de,$17FF
    add hl,de
    ld b,24
AMY_WIPE_BITMAP_UP_TILE_ROW:
    push bc
    ld b,8
AMY_WIPE_BITMAP_UP_PIXEL_ROW:
    push bc
    halt
    ld b,32
AMY_WIPE_BITMAP_UP_COLUMN:
    xor a
    ld de,1
    push de
    call FILL_VRAM
    ld de,$FFF8
    add hl,de
    pop de
    djnz AMY_WIPE_BITMAP_UP_COLUMN
    ld de,$00FF
    add hl,de
    pop bc
    djnz AMY_WIPE_BITMAP_UP_PIXEL_ROW
    ld de,$FF08
    add hl,de
    pop bc
    djnz AMY_WIPE_BITMAP_UP_TILE_ROW
    ret

; Clear bitmap COLOR bytes from top to bottom, one pixel-row per frame.
AMY_WIPE_BITMAP_DOWN:
    ld hl,($73FA)
    ld b,24
AMY_WIPE_BITMAP_DOWN_TILE_ROW:
    push bc
    ld b,8
AMY_WIPE_BITMAP_DOWN_PIXEL_ROW:
    push bc
    halt
    ld b,32
AMY_WIPE_BITMAP_DOWN_COLUMN:
    xor a
    ld de,1
    push de
    call FILL_VRAM
    ld de,$0008
    add hl,de
    pop de
    djnz AMY_WIPE_BITMAP_DOWN_COLUMN
    ld de,$FF01
    add hl,de
    pop bc
    djnz AMY_WIPE_BITMAP_DOWN_PIXEL_ROW
    ld de,$00F8
    add hl,de
    pop bc
    djnz AMY_WIPE_BITMAP_DOWN_TILE_ROW
    ret
