; Experimental segmented compact TriPCM player.
; Input: HL = entries of dw stream / db repeatDelay,boundaryDelay, followed by
; dw 0 and a loop pointer. Separate delays balance repeated units against the
; more expensive first unit of each command. A zero loop pointer returns.

AMY_PLAY_TRIPCM_SEQUENCE:
    push ix
    push iy
    push hl
    call AMY_TRIPCM_PREPARE
    pop ix

AMY_TRIPCM_SEQUENCE_PART:
    ld l,(ix+0)
    ld h,(ix+1)
    inc ix
    inc ix
    ld a,h
    or l
    jr nz,AMY_TRIPCM_SEQUENCE_START

    ; The word after the zero terminator is either a loop target or zero.
    ld l,(ix+0)
    ld h,(ix+1)
    ld a,h
    or l
    jr z,AMY_TRIPCM_SEQUENCE_END
    push hl
    pop ix
    jr AMY_TRIPCM_SEQUENCE_PART

AMY_TRIPCM_SEQUENCE_START:
    ; IYH holds repeated-unit delay; IYL holds command-boundary delay.
    ld b,(ix+0)
    ld c,(ix+1)
    push bc
    pop iy
    inc ix
    inc ix
    exx
    ld hl,AMY_TRIPCM_LEVELS+(19*3)
    ld d,0

AMY_TRIPCM_SEQUENCE_NEXT:
    exx
    ld a,(hl)
    cp $FF
    jr z,AMY_TRIPCM_SEQUENCE_PART
    inc hl
    cp $FE
    jr z,AMY_TRIPCM_SEQUENCE_LONG
    exx
    ld c,a
    ld a,c
    rlca
    rlca
    rlca
    and 7
    inc a
    jr AMY_TRIPCM_SEQUENCE_HAVE_COUNT

AMY_TRIPCM_SEQUENCE_LONG:
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

AMY_TRIPCM_SEQUENCE_HAVE_COUNT:
    ex af,af'
    ld a,c
    and $1F
    ld bc,AMY_TRIPCM_DELTAS
    add a,c
    ld c,a
    jr nc,AMY_TRIPCM_SEQUENCE_DELTA_PAGE
    inc b
AMY_TRIPCM_SEQUENCE_DELTA_PAGE:
    ld a,(bc)
    ld e,a
    bit 7,e
    jr nz,AMY_TRIPCM_SEQUENCE_NEGATIVE
    ld d,0
    jr AMY_TRIPCM_SEQUENCE_DELTA_READY
AMY_TRIPCM_SEQUENCE_NEGATIVE:
    ld d,$FF
AMY_TRIPCM_SEQUENCE_DELTA_READY:
    ex af,af'
    push iy
    pop bc
    ld b,c
AMY_TRIPCM_SEQUENCE_BOUNDARY_DELAY_LOOP:
    nop
    djnz AMY_TRIPCM_SEQUENCE_BOUNDARY_DELAY_LOOP
    ld c,$FF
AMY_TRIPCM_SEQUENCE_REPEAT:
    add hl,de
    ld b,3
    otir
    dec hl
    dec hl
    dec hl
    dec a
    jr z,AMY_TRIPCM_SEQUENCE_NEXT
    call AMY_TRIPCM_SEQUENCE_DELAY
    jr AMY_TRIPCM_SEQUENCE_REPEAT

AMY_TRIPCM_SEQUENCE_DELAY:
AMY_OPTIMIZER_TIMING_BEGIN_TRIPCM_SEQUENCE_DELAY:
    push bc
    push iy
    pop bc
AMY_TRIPCM_SEQUENCE_DELAY_LOOP:
    nop
    djnz AMY_TRIPCM_SEQUENCE_DELAY_LOOP
    pop bc
AMY_OPTIMIZER_TIMING_END_TRIPCM_SEQUENCE_DELAY:
    ret

AMY_TRIPCM_SEQUENCE_END:
    call AMY_TRIPCM_END
    pop iy
    pop ix
    ret
