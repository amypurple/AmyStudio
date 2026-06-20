; -----------------------------------------------------------------------------
; ALEXIS sprite shadow-table set/hide helpers
; Depends on AMY_SPRITE_TABLE (defined in coleco_sprite_table.asm).
; -----------------------------------------------------------------------------

; Store one sprite entry in the shadow table.
; Input: A=index, B=y, C=x, D=pattern, E=color.
AMY_SET_SPRITE:
    push de
    add a,a
    add a,a
    ld l,a
    ld h,0
    ld de,AMY_SPRITE_TABLE
    add hl,de
    ld (hl),b
    inc hl
    ld (hl),c
    inc hl
    pop de
    ld (hl),d
    inc hl
    ld (hl),e
    ret

; Hide one sprite entry by setting Y to $CF. Input: A=index.
AMY_HIDE_SPRITE:
    add a,a
    add a,a
    ld l,a
    ld h,0
    ld de,AMY_SPRITE_TABLE
    add hl,de
    ld (hl),$CF
    ret
