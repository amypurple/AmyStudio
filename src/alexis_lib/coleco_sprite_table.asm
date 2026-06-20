; -----------------------------------------------------------------------------
; ALEXIS sprite shadow-table helpers
; -----------------------------------------------------------------------------

AMY_SPRITE_COUNT EQU $7091
AMY_SPRITE_TABLE EQU $7092

; Store the number of active sprite entries to upload from the shadow table.
; Input: A = sprite count (0..32)
AMY_SET_SPRITE_COUNT:
    ld hl,AMY_SPRITE_COUNT
    ld (hl),a
    ret

; Clear the 32-entry sprite shadow table and mark it empty.
AMY_CLEAR_SPRITES:
    xor a
    ld hl,AMY_SPRITE_COUNT
    ld (hl),a
    inc hl
    ld b,$20
AMY_CLEAR_SPRITES_LOOP:
    ld (hl),$CF
    inc hl
    xor a
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    djnz AMY_CLEAR_SPRITES_LOOP
    ret

; Upload the active sprite shadow entries to the VDP sprite attribute table.
; Inputs:
;   - AMY_SPRITE_COUNT = number of active entries
;   - AMY_SPRITE_TABLE = 32 * 4 byte shadow table
AMY_UPDATE_SPRITES:
    ld hl,AMY_SPRITE_COUNT
    ld a,(hl)
    or a
    jr nz,AMY_UPDATE_SPRITES_BEGIN
    ld a,$00
    out (VDP_CTRL_PORT),a
    ld a,$5B
    out (VDP_CTRL_PORT),a
    ld a,$D0
    out (VDP_DATA_PORT),a
    ret
AMY_UPDATE_SPRITES_BEGIN:
    ld e,a
    ld a,$00
    out (VDP_CTRL_PORT),a
    ld a,$5B
    out (VDP_CTRL_PORT),a
    ld hl,AMY_SPRITE_TABLE
AMY_UPDATE_SPRITES_LOOP:
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
    dec e
    jr nz,AMY_UPDATE_SPRITES_LOOP
    ld a,$D0
    out (VDP_DATA_PORT),a
    ret
