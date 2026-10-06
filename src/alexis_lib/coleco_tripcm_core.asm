; Shared TriPCM setup, shutdown, amplitude levels, and delta table.

AMY_TRIPCM_CORE:
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
    ld a,$E7
    out ($FF),a
    ld a,$FF
    out ($FF),a
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
