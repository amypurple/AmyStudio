; Experimental long-ramp TriPCM player.
; Normal commands retain the historical format. $FE,delta,count extends one
; repeated delta to 17..256 units; count $00 means 256. $FF ends the stream.
; Input: HL = compact stream. Clobbers AF, BC, DE, HL and alternate registers.

AMY_PLAY_TRIPCM_COMPACT:
    push hl
    call AMY_TRIPCM_PREPARE
    pop hl
    exx
    ld hl,AMY_TRIPCM_LEVELS+(19*3)
    ld d,0
AMY_TRIPCM_COMPACT_NEXT:
    exx
    ld a,(hl)
    cp $FF
    jp z,AMY_TRIPCM_END
    inc hl
    cp $FE
    jr z,AMY_TRIPCM_COMPACT_LONG
    exx
    ld c,a
    ld a,c
    rlca
    rlca
    rlca
    and 7
    inc a
    jr AMY_TRIPCM_COMPACT_HAVE_COUNT

AMY_TRIPCM_COMPACT_LONG:
    ; Carry both stream bytes across EXX without using the alternate DE/HL
    ; pair that holds the current amplitude-table pointer.
    ld a,(hl)
    inc hl
    push af
    ld a,(hl)
    inc hl
    push af
    exx
    pop de
    pop af
    ld c,a
    ld a,d

AMY_TRIPCM_COMPACT_HAVE_COUNT:
    ex af,af'
    ld a,c
    and $1F
    ld bc,AMY_TRIPCM_DELTAS
    add a,c
    ld c,a
    jr nc,AMY_TRIPCM_COMPACT_DELTA_PAGE
    inc b
AMY_TRIPCM_COMPACT_DELTA_PAGE:
    ld a,(bc)
    ld e,a
    bit 7,e
    jr nz,AMY_TRIPCM_COMPACT_NEGATIVE
    ld d,0
    jr AMY_TRIPCM_COMPACT_DELTA_READY
AMY_TRIPCM_COMPACT_NEGATIVE:
    ld d,$FF
AMY_TRIPCM_COMPACT_DELTA_READY:
    ex af,af'
    ld c,$FF
AMY_TRIPCM_COMPACT_REPEAT:
    add hl,de
    ld b,3
    otir
    dec hl
    dec hl
    dec hl
    dec a
    jr z,AMY_TRIPCM_COMPACT_NEXT
    call AMY_TRIPCM_COMPACT_DELAY
    jr AMY_TRIPCM_COMPACT_REPEAT

; Keep every repeated unit on one stable cadence. Conversion compensates for
; this player's slightly lower unit rate instead of varying runtime delays.
AMY_TRIPCM_COMPACT_DELAY:
AMY_OPTIMIZER_TIMING_BEGIN_TRIPCM_COMPACT_DELAY:
    push bc
    ld b,9
AMY_TRIPCM_COMPACT_DELAY_LOOP:
    nop
    djnz AMY_TRIPCM_COMPACT_DELAY_LOOP
    pop bc
AMY_OPTIMIZER_TIMING_END_TRIPCM_COMPACT_DELAY:
    ret
