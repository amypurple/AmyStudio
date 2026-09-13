SolarUploadStarPattern:
    push af
    push bc
    push hl
    cp 65
    ld hl,SolarStarPatternsA
    jr nz,SolarUploadStarPatternReady
    ld hl,SolarStarPatternsB
SolarUploadStarPatternReady:
    xor a
    out ($BF),a
    ld a,$7A
    out ($BF),a
    ld b,16
SolarUploadStarPatternLoop:
    ld a,(hl)
    out ($BE),a
    inc hl
    djnz SolarUploadStarPatternLoop
    pop hl
    pop bc
    pop af
    ret

SolarStarPatternsA:
    db $00,$00,$00,$10,$00,$00,$00,$00
    db $00,$00,$10,$38,$10,$00,$00,$00
SolarStarPatternsB:
    db $00,$00,$10,$38,$10,$00,$00,$00
    db $00,$00,$00,$10,$00,$00,$00,$00
