; -----------------------------------------------------------------------------
; ALEXIS screen wipe animations (one row per frame via halt)
; -----------------------------------------------------------------------------

; Blank name table rows bottom-to-top, one row per frame (24 frames total).
AMY_WIPE_SCREEN_UP:
    ld hl,($73F6)
    ld de,$02E0
    add hl,de
    ld b,24
AMY_WIPE_SCREEN_UP_ROW:
    halt
    ld de,32
    ld a,$20
    call FILL_VRAM
    ld de,$FFE0
    add hl,de
    djnz AMY_WIPE_SCREEN_UP_ROW
    ret

; Blank name table rows top-to-bottom, one row per frame (24 frames total).
AMY_WIPE_SCREEN_DOWN:
    ld hl,($73F6)
    ld b,24
AMY_WIPE_SCREEN_DOWN_ROW:
    halt
    ld de,32
    ld a,$20
    call FILL_VRAM
    ld de,32
    add hl,de
    djnz AMY_WIPE_SCREEN_DOWN_ROW
    ret
