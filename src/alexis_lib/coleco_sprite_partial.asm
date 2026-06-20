; -----------------------------------------------------------------------------
; ALEXIS partial sprite upload helper
; -----------------------------------------------------------------------------

; Upload A sprite entries from HL to VRAM sprite attribute table at DE, then write $D0 terminator.
AMY_UPDATE_SPRITES_PARTIAL:
    ld b,a
    ld a,e
    out (VDP_CTRL_PORT),a
    ld a,d
    or $40
    out (VDP_CTRL_PORT),a
    ld a,b
    or a
    jr z,AMY_UPDATE_SPRITES_PARTIAL_TERMINATOR
AMY_UPDATE_SPRITES_PARTIAL_LOOP:
    ld a,(hl)
    out (VDP_DATA_PORT),a
    inc hl
    ld a,(hl)
    out (VDP_DATA_PORT),a
    inc hl
    ld a,(hl)
    out (VDP_DATA_PORT),a
    inc hl
    ld a,(hl)
    and $8F
    out (VDP_DATA_PORT),a
    inc hl
    djnz AMY_UPDATE_SPRITES_PARTIAL_LOOP
AMY_UPDATE_SPRITES_PARTIAL_TERMINATOR:
    ld a,$D0
    out (VDP_DATA_PORT),a
    ret
