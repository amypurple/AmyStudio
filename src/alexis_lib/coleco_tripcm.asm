; Three-channel streaming digital audio player.
; Format recovered from Amy Bienvenu's 2009 result_19 ROM.
;
; Input: HL = compressed stream ending in $FF.
; Clobbers: AF, BC, DE, HL and alternate BC/DE/HL.
; The caller must disable NMI before playback and restore it afterward.

AMY_PLAY_TRIPCM:
    call AMY_TRIPCM_PREPARE
    exx
    ld hl,AMY_TRIPCM_LEVELS+(19*3)
    ld d,0
AMY_TRIPCM_NEXT:
    exx
    ld a,(hl)
    cp $FF
    jp z,AMY_TRIPCM_END
    inc hl
    exx
    ld e,a
    and $1F
    ld bc,AMY_TRIPCM_DELTAS
    add a,c
    ld c,a
    jr nc,AMY_TRIPCM_DELTA_PAGE
    inc b
AMY_TRIPCM_DELTA_PAGE:
    ld a,(bc)
    ld c,e
    ld e,a
    bit 7,e
    jr nz,AMY_TRIPCM_NEGATIVE
    ld d,0
    jr AMY_TRIPCM_DELTA_READY
AMY_TRIPCM_NEGATIVE:
    ld d,$FF
AMY_TRIPCM_DELTA_READY:
    ld a,c
    ld c,$FF
    rlca
    rlca
    rlca
    and 7
    inc a
AMY_TRIPCM_REPEAT:
    add hl,de
    ld b,3
    otir
    dec hl
    dec hl
    dec hl
    dec a
    jr z,AMY_TRIPCM_NEXT
AMY_TRIPCM_REPEAT_CONTINUE:
    call AMY_TRIPCM_DELAY
    jr AMY_TRIPCM_REPEAT

; Matches the historical player's fixed per-unit delay.
AMY_TRIPCM_DELAY:
AMY_OPTIMIZER_TIMING_BEGIN_TRIPCM_DELAY:
    push bc
    ld b,6
AMY_TRIPCM_DELAY_LOOP:
    nop
    djnz AMY_TRIPCM_DELAY_LOOP
    pop bc
AMY_OPTIMIZER_TIMING_END_TRIPCM_DELAY:
    ret

