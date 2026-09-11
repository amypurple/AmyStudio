; Three-channel streaming digital audio player.
; Format recovered from Amy Bienvenu's 2009 result_19 ROM.
;
; Input: HL = compressed stream ending in $FF.
; Clobbers: AF, BC, DE, HL and alternate BC/DE/HL.
; The caller must disable NMI before playback and restore it afterward.

AMY_PLAY_TRIPCM:
    push hl
    call AMY_TRIPCM_PREPARE
    pop hl
    exx
    ld hl,AMY_TRIPCM_LEVELS+(19*3)
    ld d,0
AMY_TRIPCM_NEXT:
    exx
    ld a,(hl)
    cp $FF
    jr z,AMY_TRIPCM_END
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
    add hl,de
AMY_TRIPCM_REPEAT:
    ld b,3
    otir
    dec hl
    dec hl
    dec hl
    dec a
    jr z,AMY_TRIPCM_NEXT
    call AMY_TRIPCM_DELAY
    jr AMY_TRIPCM_REPEAT

AMY_TRIPCM_END:
    exx
    ld a,$9F
    out ($FF),a
    ld a,$BF
    out ($FF),a
    ld a,$DF
    out ($FF),a
    ret

AMY_TRIPCM_PREPARE:
    ld bc,$0381
AMY_TRIPCM_PREPARE_TONE:
    ld a,c
    out ($FF),a
    add a,$20
    ld c,a
    xor a
    out ($FF),a
    djnz AMY_TRIPCM_PREPARE_TONE
    ld a,$FF
    out ($FF),a
    ret

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

AMY_TRIPCM_LEVELS:
    db $9F,$BF,$DF,$9E,$BF,$DF,$9E,$BE,$DF,$9E,$BE,$DE
    db $9D,$BE,$DE,$9D,$BD,$DE,$9D,$BD,$DD,$9C,$BD,$DD
    db $9C,$BC,$DD,$9C,$BC,$DC,$9B,$BC,$DC,$9B,$BB,$DC
    db $9B,$BB,$DB,$9A,$BB,$DB,$9A,$BA,$DB,$9A,$BA,$DA
    db $99,$BA,$DA,$99,$B9,$DA,$99,$B9,$D9,$98,$B9,$D9
    db $98,$B8,$D9,$98,$B8,$D8,$97,$B8,$D8,$97,$B7,$D8
    db $97,$B7,$D7,$96,$B7,$D7,$96,$B6,$D7,$96,$B6,$D6
    db $95,$B6,$D6,$95,$B5,$D6,$95,$B5,$D5,$94,$B5,$D5
    db $94,$B4,$D5,$94,$B4,$D4,$93,$B4,$D4,$93,$B3,$D4
    db $93,$B3,$D3,$92,$B3,$D3,$92,$B2,$D3,$92,$B2,$D2
    db $91,$B2,$D2,$91,$B1,$D2,$91,$B1,$D1,$90,$B1,$D1
    db $90,$B0,$D1,$90,$B0,$D0

AMY_TRIPCM_DELTAS:
    db $00,$FD,$03,$06,$FA,$09,$F7,$0C,$F4,$0F,$F1,$EE
    db $12,$15,$EB,$18,$E8,$1B,$1E,$E5,$E2,$21,$DC,$DF
    db $D9,$24,$27,$D6,$2A,$30,$D3,$2D
