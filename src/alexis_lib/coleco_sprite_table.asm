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
    ld a,(AMY_SPRITE_COUNT)
    ld e,a
    xor a
    out (VDP_CTRL_PORT),a
    ld a,$5B
    out (VDP_CTRL_PORT),a
    ld a,e
    or a
    jr z,AMY_UPDATE_SPRITES_TERMINATOR
    push bc
    ld c,VDP_DATA_PORT
    ld hl,AMY_SPRITE_TABLE
AMY_UPDATE_SPRITES_LOOP:
    outi
    outi
    outi
    ld a,(hl)
    and $8F
    out (c),a
    inc hl
    dec e
    jr nz,AMY_UPDATE_SPRITES_LOOP
    pop bc
AMY_UPDATE_SPRITES_TERMINATOR:
    ld a,$D0
    out (VDP_DATA_PORT),a
    ret

; Enable status-driven sprite priority rotation. Stable sprites are configured by
; the project constants AMY_SPRITE_STABLE_FIRST/LAST and always upload first.
AMY_SPRITE_FLICKER_ON:
    ld a,1
    ld (AMY_SPRITE_FLICKER_ENABLED),a
    xor a
    ld (AMY_SPRITE_FLICKER_PHASE),a
    ret

; Disable rotation. The normal uploader restores identity order on the next update.
AMY_SPRITE_FLICKER_OFF:
    xor a
    ld (AMY_SPRITE_FLICKER_ENABLED),a
    ld (AMY_SPRITE_FLICKER_PHASE),a
    ret

; Upload active logical sprites through a transient physical priority order.
; VDP_STATUS is the NMI-captured status byte; never read the VDP port here.
AMY_UPDATE_SPRITES_FLICKER:
    ld a,(AMY_SPRITE_FLICKER_ENABLED)
    or a
    jp z,AMY_UPDATE_SPRITES
    ld a,(AMY_SPRITE_COUNT)
    or a
    jr z,AMY_UPDATE_SPRITES_FLICKER_OPEN
    ld e,a
    ld a,(VDP_STATUS)
    and $40
    jr z,AMY_UPDATE_SPRITES_FLICKER_OPEN
    ld a,(AMY_SPRITE_FLICKER_PHASE)
    ld b,e
AMY_UPDATE_SPRITES_FLICKER_ADVANCE_PHASE:
    inc a
    cp e
    jr c,AMY_UPDATE_SPRITES_FLICKER_PHASE_NO_WRAP
    xor a
AMY_UPDATE_SPRITES_FLICKER_PHASE_NO_WRAP:
    cp AMY_SPRITE_STABLE_FIRST
    jr c,AMY_UPDATE_SPRITES_FLICKER_STORE_PHASE
    cp AMY_SPRITE_STABLE_LAST+1
    jr nc,AMY_UPDATE_SPRITES_FLICKER_STORE_PHASE
    djnz AMY_UPDATE_SPRITES_FLICKER_ADVANCE_PHASE
    xor a                     ; Every active sprite is stable: keep identity phase.
AMY_UPDATE_SPRITES_FLICKER_STORE_PHASE:
    ld (AMY_SPRITE_FLICKER_PHASE),a

AMY_UPDATE_SPRITES_FLICKER_OPEN:
    xor a
    out (VDP_CTRL_PORT),a
    ld a,$5B
    out (VDP_CTRL_PORT),a
    ld a,(AMY_SPRITE_COUNT)
    or a
    jr z,AMY_UPDATE_SPRITES_FLICKER_TERMINATOR
    ld e,a

    ; Stable logical sprites are packed first while retaining their relative order.
    ld b,AMY_SPRITE_STABLE_FIRST
AMY_UPDATE_SPRITES_FLICKER_STABLE_LOOP:
    ld a,b
    cp e
    jr nc,AMY_UPDATE_SPRITES_FLICKER_ELIGIBLE_BEGIN
    cp AMY_SPRITE_STABLE_LAST+1
    jr nc,AMY_UPDATE_SPRITES_FLICKER_ELIGIBLE_BEGIN
    call AMY_UPDATE_SPRITES_FLICKER_WRITE_B
    inc b
    jr AMY_UPDATE_SPRITES_FLICKER_STABLE_LOOP

    ; Scan every active logical index from the rotating phase and upload only
    ; non-stable entries. This is fair without changing logical sprite identity.
AMY_UPDATE_SPRITES_FLICKER_ELIGIBLE_BEGIN:
    ld a,(AMY_SPRITE_FLICKER_PHASE)
    ld b,a
    ld d,e
AMY_UPDATE_SPRITES_FLICKER_ELIGIBLE_LOOP:
    ld a,b
    cp AMY_SPRITE_STABLE_FIRST
    jr c,AMY_UPDATE_SPRITES_FLICKER_WRITE_ELIGIBLE
    cp AMY_SPRITE_STABLE_LAST+1
    jr c,AMY_UPDATE_SPRITES_FLICKER_SKIP_ELIGIBLE
AMY_UPDATE_SPRITES_FLICKER_WRITE_ELIGIBLE:
    call AMY_UPDATE_SPRITES_FLICKER_WRITE_B
AMY_UPDATE_SPRITES_FLICKER_SKIP_ELIGIBLE:
    inc b
    ld a,b
    cp e
    jr c,AMY_UPDATE_SPRITES_FLICKER_NO_WRAP
    ld b,0
AMY_UPDATE_SPRITES_FLICKER_NO_WRAP:
    dec d
    jr nz,AMY_UPDATE_SPRITES_FLICKER_ELIGIBLE_LOOP

AMY_UPDATE_SPRITES_FLICKER_TERMINATOR:
    ld a,$D0
    out (VDP_DATA_PORT),a
    ret

; Input B = logical sprite index. Preserves BC, DE and writes one SAT entry.
AMY_UPDATE_SPRITES_FLICKER_WRITE_B:
    push bc
    push de
    ld a,b
    add a,a
    add a,a
    ld l,a
    ld h,0
    ld de,AMY_SPRITE_TABLE
    add hl,de
    ld c,VDP_DATA_PORT
    outi
    outi
    outi
    ld a,(hl)
    and $8F
    out (c),a
    pop de
    pop bc
    ret
