; -----------------------------------------------------------------------------
; ALEXIS double-buffered name table page helpers
; AMY_SCREEN_VIEW_POINTER is emitted by project.js when these are used.
; -----------------------------------------------------------------------------

; Select viewed HL and edit DE name tables for double-buffered text screens.
AMY_SET_SCREEN_PAGES:
    push de
    ld bc,AMY_SCREEN_VIEW_POINTER
    ld a,l
    ld (bc),a
    inc bc
    ld a,h
    ld (bc),a
    push ix
    push iy
    ld a,2
    call INIT_TABLE
    pop iy
    pop ix
    pop de
    ld ($73F6),de
    ret

; Swap the viewed and edit name tables configured by AMY_SET_SCREEN_PAGES.
AMY_SWAP_SCREEN_PAGES:
    ld de,(AMY_SCREEN_VIEW_POINTER)
    ld hl,($73F6)
    jp AMY_SET_SCREEN_PAGES
