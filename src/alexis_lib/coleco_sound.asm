; -----------------------------------------------------------------------------
; ALEXIS native ColecoVision sound helpers
; Ported from lib4ksa/sndtbl.s, sound.s and mute.s with ALEXIS-friendly labels.
; Includes NewColeco-style tiny sound entry points for compact music data.
; -----------------------------------------------------------------------------

; Install a sound table. Input: HL = sound table pointer, or 0 for dummy table.
AMY_SET_SOUND_TABLE:
    ld a,(AMY_SOUND_AREA_COUNT)
    ld b,a
    ld a,h
    or a
    jr nz,AMY_SET_SOUND_TABLE_CALL
    ld hl,AMY_SOUND_TABLE_DUMMY
AMY_SET_SOUND_TABLE_CALL:
    ld (AMY_SOUND_TABLE_POINTER),hl
    jp SET_SOUND_TABLE

; Play a sound slot. Input: B = sound index.
AMY_PLAY_SOUND:
    push ix
    push iy
    call PLAY_SOUND_SLOT
    pop iy
    pop ix
    ret

; Terminate a sound table entry by index. Input: B = sound index.
; Resolve the table entry to its target sound area and stop that area. This is
; intentionally more direct than lib4ksa _stop_sound because Amy pure Coleco
; sound effects use command bytes whose low bits are not the sound table index.
AMY_STOP_SOUND:
    ld a,b
    push hl
    push de
    ld hl,(AMY_SOUND_TABLE_POINTER)
    ld de,AMY_SOUND_TABLE_DUMMY
    or a
    sbc hl,de
    add hl,de
    jr nz,AMY_STOP_SOUND_HAS_TABLE
    cp $01
    jr nz,AMY_STOP_SOUND_DONE
AMY_STOP_SOUND_HAS_TABLE:
    dec hl
    dec hl
    ld de,$0004
    or a
    jr z,AMY_STOP_SOUND_DONE
AMY_STOP_SOUND_LOOP:
    add hl,de
    djnz AMY_STOP_SOUND_LOOP
    ld e,(hl)
    inc hl
    ld d,(hl)
    ex de,hl
AMY_STOP_SOUND_WRITE:
    ld (hl),$FF
AMY_STOP_SOUND_DONE:
    pop de
    pop hl
    ret

; Clear all active sound areas and silence the PSG.
AMY_MUTE_ALL:
    ld a,(AMY_SOUND_AREA_COUNT)
    ld b,a
    or a
    jp z,AMY_MUTE_ALL_TURN_OFF
    ld de,$000A
    ld hl,$702B
AMY_MUTE_ALL_LOOP:
    ld (hl),$FF
    add hl,de
    djnz AMY_MUTE_ALL_LOOP
AMY_MUTE_ALL_TURN_OFF:
    jp TURN_OFF_SOUND
