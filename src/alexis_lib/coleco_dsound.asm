; -----------------------------------------------------------------------------
; ALEXIS 4-bit PCM digital sound player (delta-encoded, PSG amplitude channel)
; Blocking call — silences PSG during playback.
; -----------------------------------------------------------------------------

; Play 4-bit PCM digital sound. Input: HL = sound data ptr, C = delay step (0=fastest/highest quality).
; Blocking call: silences PSG during playback. Clobbers af, bc, de, hl.
AMY_PLAY_DSOUND:
    inc c
    push bc
    push hl
    call AMY_DSOUND_QUIET
    pop hl
    pop bc
AMY_DSOUND_LOOP1:
    ld a,(hl)
    or a
    jr z,AMY_DSOUND_SPECIAL
    rrca
    rrca
    rrca
    rrca
    call AMY_DSOUND_VOLUME_ALL
    ld a,(hl)
    inc hl
    ld b,1
    ld b,1
    ld b,1
    nop
    nop
    nop
    call AMY_DSOUND_VOLUME_ALL
    jp AMY_DSOUND_LOOP1
AMY_DSOUND_SPECIAL:
    inc hl
    ld d,(hl)
    ld a,d
    cp 0
    jp nz,AMY_DSOUND_SMALL_LOOP2
    ret
AMY_DSOUND_LOOP2:
    ld b,5
    nop
AMY_DSOUND_DO_NOTHING1:
    djnz AMY_DSOUND_DO_NOTHING1
AMY_DSOUND_SMALL_LOOP2:
    ld b,2
AMY_DSOUND_DO_NOTHING2:
    djnz AMY_DSOUND_DO_NOTHING2
    ld b,2
    nop
    nop
    nop
    ld b,c
AMY_DSOUND_DO_NOTHING3:
    djnz AMY_DSOUND_DO_NOTHING3
    dec d
    jr nz,AMY_DSOUND_LOOP2
    inc hl
    jp AMY_DSOUND_LOOP1
AMY_DSOUND_VOLUME_ALL:
    and $0F
    or $90
    out ($FF),a
    or $B0
    out ($FF),a
    xor $60
    out ($FF),a
    ld b,c
AMY_DSOUND_DO_NOTHING4:
    djnz AMY_DSOUND_DO_NOTHING4
    ret
AMY_DSOUND_QUIET:
    ld bc,$0381
AMY_DSOUND_QUIET_LOOP:
    ld a,c
    out ($FF),a
    add a,$20
    ld c,a
    ld a,0
    out ($FF),a
    djnz AMY_DSOUND_QUIET_LOOP
    ld a,$FF
    out ($FF),a
    ret
