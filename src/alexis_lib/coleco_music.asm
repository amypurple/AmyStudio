; -----------------------------------------------------------------------------
; ALEXIS native ColecoVision music helpers
; Adapted from lib4ksa/music.s for music-table playback.
; -----------------------------------------------------------------------------

; Set the current music table pointer. Input: HL = song table.
AMY_NEXT_SONG:
    ld de,AMY_MUSIC_POINTER
    ld a,l
    ld (de),a
    inc de
    ld a,h
    ld (de),a
    ret

; Start a music-table song immediately. Input: HL = song table.
AMY_PLAY_SONG:
    call AMY_NEXT_SONG
    jp AMY_TRIGGER_SOUNDS

; Called every frame from NMI when music runtime is enabled.
AMY_UPDATE_MUSIC:
    ld hl,AMY_MUSIC_COUNTER+1
    ld a,(hl)
    dec hl
    or a
    jr nz,AMY_UPDATE_MUSIC_COUNTER
    ld a,(hl)
    or a
    jp z,AMY_TRIGGER_SOUNDS
AMY_UPDATE_MUSIC_COUNTER:
    ld a,(hl)
    sub $01
    ld (hl),a
    inc hl
    ld a,(hl)
    sbc a,$00
    ld (hl),a
    ret

AMY_TRIGGER_SOUNDS:
    ld hl,AMY_MUSIC_POINTER
    ld e,(hl)
    inc hl
    ld d,(hl)
    ex de,hl
    ld e,(hl)
    inc hl
    ld d,(hl)
    xor a
    sub d
    jr nz,AMY_TRIGGER_SOUNDS_NOT_END
    sub e
    ret z
AMY_TRIGGER_SOUNDS_NOT_END:
    bit 7,d
    jr z,AMY_TRIGGER_SOUNDS_DURATION
    ld hl,AMY_MUSIC_POINTER
    ld (hl),e
    inc hl
    ld (hl),d
    jr AMY_TRIGGER_SOUNDS
AMY_TRIGGER_SOUNDS_DURATION:
    dec de
    ld hl,AMY_MUSIC_COUNTER
    ld (hl),e
    inc hl
    ld (hl),d
    ld hl,AMY_MUSIC_POINTER
    ld e,(hl)
    inc hl
    ld d,(hl)
    call AMY_STOP_SONG_AREAS
    ex de,hl
    inc hl
    inc hl
    ld a,(hl)
    rlca
    rlca
    and $03
    inc a
    ld b,a
AMY_TRIGGER_SOUNDS_LOOP:
    ld a,(hl)
    inc hl
    and $3F
    push bc
    push de
    push hl
    ld b,a
    call AMY_PLAY_SOUND
    pop hl
    pop de
    pop bc
    djnz AMY_TRIGGER_SOUNDS_LOOP
    ex de,hl
    ld hl,AMY_MUSIC_POINTER
    ld (hl),e
    inc hl
    ld (hl),d
    jp $0295

; Stop music-table playback and clear the reserved first 4 sound areas.
AMY_STOP_SONG:
    ld hl,AMY_MUSIC_POINTER
    ld de,AMY_NO_MUSIC_TRACK
    ld (hl),e
    inc hl
    ld (hl),d
    call AMY_STOP_SONG_AREAS
    jp $0295

AMY_STOP_SONG_AREAS:
    ld b,$04
    xor a
    ld hl,$702B
AMY_STOP_SONG_AREAS_LOOP:
    ld (hl),$FF
    inc hl
    inc hl
    inc hl
    inc hl
    ld (hl),$F0
    inc hl
    ld (hl),a
    inc hl
    inc hl
    ld (hl),a
    inc hl
    ld (hl),a
    inc hl
    inc hl
    djnz AMY_STOP_SONG_AREAS_LOOP
    ret
