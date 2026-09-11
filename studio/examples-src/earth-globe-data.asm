; ==========================================================
; COLECOVISION (TMS9918A) EARTH ROTATION DATA TABLES
; 12 Bi-Hourly Frames (30 deg step = 1 frame every 2 hours)
; Reserved Tiles:
;   Tile $00 = Void Mask (All $00 bytes, Black color)
;   Tile $FF = Pure Ocean (All $00 bytes, Blue color)
; Unique Pattern Tiles: 254 ($01 to $FE)
; 12 Mask Sprites (16x16, 32 bytes each) = 384 Bytes
; 12 Frame Tilemaps (8x8 tiles = 64 bytes each) = 768 Bytes
; ==========================================================

ifdef EARTH_RAW_ASSETS
RESERVED_TILE_00_VOID:
    .db $00, $00, $00, $00, $00, $00, $00, $00 ; Tile $00 (Void)

RESERVED_TILE_FF_OCEAN:
    .db $00, $00, $00, $00, $00, $00, $00, $00 ; Tile $FF (Pure Ocean)

EARTH_PATTERN_TILES: ; 254 Unique 8x8 Tiles ($01 to $FE)
    .db $CF, $01, $01, $01, $01, $03, $07, $0F ; Tile $01
    .db $E0, $F8, $FE, $FF, $FF, $FF, $FF, $FF ; Tile $02
    .db $80, $00, $00, $A0, $F8, $F2, $C1, $C0 ; Tile $03
    .db $0E, $1F, $0F, $0F, $0F, $17, $17, $17 ; Tile $04
    .db $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF ; Tile $05
    .db $F6, $FE, $FF, $CF, $EF, $FF, $FF, $FF ; Tile $06
    .db $18, $9C, $CC, $E0, $F0, $F0, $E8, $20 ; Tile $07
    .db $03, $03, $03, $03, $01, $00, $00, $00 ; Tile $08
    .db $FF, $E1, $C0, $80, $80, $C0, $60, $20 ; Tile $09
    .db $FC, $F8, $60, $60, $40, $00, $80, $C0 ; Tile $0A
    .db $10, $00, $00, $00, $04, $02, $00, $00 ; Tile $0B
    .db $10, $00, $00, $00, $00, $00, $F8, $FC ; Tile $0C
    .db $00, $00, $00, $00, $01, $01, $01, $01 ; Tile $0D
    .db $00, $01, $07, $0F, $0F, $1F, $1F, $1F ; Tile $0E
    .db $00, $80, $80, $C0, $E0, $E0, $E0, $F0 ; Tile $0F
    .db $01, $01, $01, $01, $02, $02, $02, $02 ; Tile $10
    .db $1F, $1F, $1F, $1F, $1F, $1F, $1F, $1F ; Tile $11
    .db $F0, $F8, $F8, $FC, $FC, $FE, $FC, $F8 ; Tile $12
    .db $00, $00, $00, $00, $01, $03, $07, $0F ; Tile $13
    .db $3F, $3F, $3F, $FF, $FF, $FF, $FA, $80 ; Tile $14
    .db $FF, $FF, $FF, $FE, $F8, $C0, $00, $00 ; Tile $15
    .db $E0, $C0, $80, $00, $00, $00, $00, $00 ; Tile $16
    .db $08, $06, $03, $00, $00, $00, $00, $00 ; Tile $17
    .db $00, $00, $80, $E0, $38, $0F, $01, $00 ; Tile $18
    .db $0E, $1C, $18, $00, $00, $E0, $C0, $08 ; Tile $19
    .db $00, $38, $FF, $0F, $07, $03, $01, $01 ; Tile $1A
    .db $00, $00, $00, $80, $E0, $F9, $FF, $FF ; Tile $1B
    .db $00, $00, $00, $00, $00, $00, $C0, $80 ; Tile $1C
    .db $00, $00, $01, $01, $01, $01, $01, $00 ; Tile $1D
    .db $E0, $C0, $C8, $E4, $FE, $FF, $FF, $F7 ; Tile $1E
    .db $FF, $FF, $3F, $3F, $1F, $5F, $1F, $0F ; Tile $1F
    .db $F3, $FB, $FF, $FF, $FF, $FF, $FF, $06 ; Tile $20
    .db $E0, $C0, $E0, $80, $80, $00, $00, $00 ; Tile $21
    .db $0F, $0E, $06, $03, $00, $00, $00, $00 ; Tile $22
    .db $02, $00, $00, $00, $80, $81, $40, $00 ; Tile $23
    .db $00, $00, $10, $09, $03, $07, $07, $0F ; Tile $24
    .db $00, $00, $00, $80, $C0, $E0, $E0, $F0 ; Tile $25
    .db $00, $10, $00, $10, $10, $00, $00, $00 ; Tile $26
    .db $1F, $3F, $7F, $7F, $7F, $7F, $FF, $FF ; Tile $27
    .db $F0, $F0, $F0, $F0, $F0, $F0, $F0, $F0 ; Tile $28
    .db $00, $01, $01, $01, $03, $03, $07, $0F ; Tile $29
    .db $00, $00, $C0, $F0, $3C, $0F, $01, $00 ; Tile $2A
    .db $00, $00, $01, $03, $0E, $10, $00, $00 ; Tile $2B
    .db $3F, $7F, $F8, $80, $00, $00, $00, $00 ; Tile $2C
    .db $0F, $FF, $00, $00, $00, $00, $00, $00 ; Tile $2D
    .db $E0, $F0, $00, $00, $01, $01, $00, $00 ; Tile $2E
    .db $00, $00, $00, $00, $F0, $FC, $3F, $07 ; Tile $2F
    .db $03, $01, $00, $00, $00, $00, $00, $00 ; Tile $30
    .db $F8, $FC, $FE, $7E, $7F, $3F, $3F, $3F ; Tile $31
    .db $00, $00, $00, $00, $00, $10, $10, $10 ; Tile $32
    .db $3F, $3F, $1F, $1F, $0F, $0F, $07, $07 ; Tile $33
    .db $F0, $F0, $E8, $F8, $F4, $FC, $FC, $FC ; Tile $34
    .db $00, $00, $60, $60, $E0, $E0, $E0, $E0 ; Tile $35
    .db $07, $05, $01, $01, $00, $00, $00, $00 ; Tile $36
    .db $FC, $FC, $FC, $E4, $E0, $E0, $C0, $60 ; Tile $37
    .db $E0, $F0, $F0, $F0, $70, $70, $30, $30 ; Tile $38
    .db $22, $30, $11, $00, $00, $00, $02, $02 ; Tile $39
    .db $00, $00, $00, $20, $30, $00, $40, $00 ; Tile $3A
    .db $06, $04, $04, $0C, $18, $18, $30, $30 ; Tile $3B
    .db $00, $00, $E0, $F8, $3E, $0F, $01, $00 ; Tile $3C
    .db $00, $00, $00, $01, $04, $10, $80, $00 ; Tile $3D
    .db $00, $01, $0F, $3F, $FF, $F0, $C8, $83 ; Tile $3E
    .db $0F, $FF, $FF, $FF, $C2, $00, $00, $00 ; Tile $3F
    .db $F0, $FC, $FE, $FF, $7F, $18, $00, $00 ; Tile $40
    .db $00, $00, $00, $80, $C0, $00, $03, $03 ; Tile $41
    .db $1E, $3C, $64, $C0, $80, $10, $30, $20 ; Tile $42
    .db $F8, $FC, $0E, $07, $03, $01, $00, $00 ; Tile $43
    .db $00, $00, $00, $0C, $0C, $0F, $22, $00 ; Tile $44
    .db $70, $30, $38, $38, $1C, $1C, $1C, $0E ; Tile $45
    .db $10, $00, $00, $00, $00, $03, $0F, $1F ; Tile $46
    .db $20, $38, $18, $0C, $04, $C2, $F0, $F0 ; Tile $47
    .db $0E, $06, $06, $06, $03, $03, $01, $01 ; Tile $48
    .db $3F, $3F, $3F, $3F, $3F, $1F, $1F, $03 ; Tile $49
    .db $F0, $F8, $F8, $F8, $F8, $F8, $FC, $FC ; Tile $4A
    .db $FC, $FC, $78, $30, $00, $00, $10, $00 ; Tile $4B
    .db $00, $00, $00, $00, $00, $00, $20, $18 ; Tile $4C
    .db $04, $02, $30, $10, $00, $00, $00, $00 ; Tile $4D
    .db $00, $C0, $F0, $FC, $3F, $0F, $01, $00 ; Tile $4E
    .db $00, $00, $00, $00, $00, $80, $E0, $0C ; Tile $4F
    .db $00, $00, $80, $E0, $F0, $FC, $FE, $FF ; Tile $50
    .db $1F, $3F, $7F, $E7, $87, $03, $07, $07 ; Tile $51
    .db $FF, $FF, $FF, $FF, $FF, $FF, $C1, $80 ; Tile $52
    .db $FF, $F2, $E2, $C0, $80, $00, $80, $00 ; Tile $53
    .db $E1, $00, $06, $18, $00, $00, $00, $00 ; Tile $54
    .db $1E, $00, $00, $00, $00, $00, $00, $00 ; Tile $55
    .db $0F, $0E, $08, $40, $60, $40, $40, $47 ; Tile $56
    .db $00, $00, $06, $06, $04, $00, $00, $80 ; Tile $57
    .db $47, $07, $20, $10, $08, $00, $00, $00 ; Tile $58
    .db $00, $60, $60, $60, $00, $01, $01, $00 ; Tile $59
    .db $00, $00, $00, $07, $1F, $1F, $1F, $1F ; Tile $5A
    .db $00, $00, $78, $FF, $FF, $FF, $FF, $FF ; Tile $5B
    .db $60, $30, $18, $08, $C0, $C0, $C0, $C0 ; Tile $5C
    .db $1F, $1F, $1F, $01, $00, $00, $00, $00 ; Tile $5D
    .db $FF, $FF, $FF, $FF, $3F, $1F, $1F, $0F ; Tile $5E
    .db $C0, $E0, $E0, $E0, $E0, $E0, $E0, $C0 ; Tile $5F
    .db $80, $00, $00, $00, $00, $00, $00, $06 ; Tile $60
    .db $00, $00, $00, $00, $00, $40, $60, $00 ; Tile $61
    .db $00, $00, $00, $00, $00, $E0, $F0, $0E ; Tile $62
    .db $00, $01, $0F, $27, $DF, $FF, $FF, $FF ; Tile $63
    .db $00, $00, $C0, $F0, $F8, $FE, $FF, $FF ; Tile $64
    .db $1F, $3B, $70, $C0, $81, $01, $01, $01 ; Tile $65
    .db $FF, $FF, $FF, $FF, $FF, $FF, $FF, $F1 ; Tile $66
    .db $FF, $FF, $FF, $FF, $FC, $F8, $00, $20 ; Tile $67
    .db $F0, $F8, $FC, $FC, $00, $00, $00, $C0 ; Tile $68
    .db $01, $03, $02, $01, $00, $00, $00, $00 ; Tile $69
    .db $FF, $FF, $7F, $7F, $7E, $7C, $F8, $E0 ; Tile $6A
    .db $FE, $FE, $FC, $F0, $04, $00, $00, $00 ; Tile $6B
    .db $21, $0E, $10, $00, $00, $00, $00, $00 ; Tile $6C
    .db $00, $00, $40, $40, $40, $40, $40, $40 ; Tile $6D
    .db $00, $06, $04, $04, $04, $02, $02, $00 ; Tile $6E
    .db $80, $00, $00, $00, $00, $3E, $1E, $1E ; Tile $6F
    .db $18, $18, $18, $00, $00, $00, $00, $00 ; Tile $70
    .db $C0, $C0, $00, $00, $03, $01, $01, $00 ; Tile $71
    .db $00, $1F, $FF, $FF, $FF, $FF, $FF, $FF ; Tile $72
    .db $60, $30, $00, $00, $80, $80, $80, $80 ; Tile $73
    .db $3F, $07, $01, $01, $00, $00, $00, $00 ; Tile $74
    .db $FF, $FF, $FF, $FF, $FE, $78, $10, $00 ; Tile $75
    .db $00, $00, $00, $03, $00, $00, $00, $00 ; Tile $76
    .db $00, $10, $30, $00, $00, $00, $00, $00 ; Tile $77
    .db $00, $01, $0F, $1E, $9D, $1F, $3F, $BF ; Tile $78
    .db $0F, $FF, $FF, $FF, $FF, $E7, $9F, $BF ; Tile $79
    .db $00, $00, $00, $E0, $FC, $FF, $FF, $FF ; Tile $7A
    .db $1F, $3F, $7E, $FE, $FE, $FC, $FD, $FD ; Tile $7B
    .db $7F, $7F, $FF, $FB, $FF, $FD, $F0, $E0 ; Tile $7C
    .db $FF, $FF, $FF, $FF, $FF, $FF, $7F, $1F ; Tile $7D
    .db $FF, $FE, $FF, $FC, $F0, $E0, $C0, $80 ; Tile $7E
    .db $1F, $1F, $1F, $1F, $1F, $1F, $1C, $18 ; Tile $7F
    .db $FF, $FF, $FF, $FF, $FF, $87, $03, $01 ; Tile $80
    .db $FE, $FE, $F2, $F0, $E4, $E4, $E1, $E0 ; Tile $81
    .db $7F, $7F, $7E, $7E, $7C, $7C, $78, $78 ; Tile $82
    .db $00, $00, $00, $00, $00, $00, $C0, $E0 ; Tile $83
    .db $10, $04, $00, $00, $00, $00, $00, $00 ; Tile $84
    .db $FF, $FF, $F8, $F8, $F0, $C0, $80, $00 ; Tile $85
    .db $C0, $C0, $20, $00, $00, $00, $60, $60 ; Tile $86
    .db $78, $78, $70, $71, $70, $30, $20, $00 ; Tile $87
    .db $C0, $C0, $C0, $80, $00, $00, $00, $00 ; Tile $88
    .db $08, $08, $08, $04, $04, $00, $00, $01 ; Tile $89
    .db $00, $00, $00, $38, $3C, $3C, $1B, $03 ; Tile $8A
    .db $20, $20, $00, $00, $00, $00, $80, $00 ; Tile $8B
    .db $41, $00, $00, $00, $00, $00, $03, $7F ; Tile $8C
    .db $00, $10, $18, $0C, $04, $06, $82, $F0 ; Tile $8D
    .db $07, $07, $0F, $0F, $1F, $07, $00, $00 ; Tile $8E
    .db $F0, $F0, $F0, $E0, $E0, $C0, $C0, $80 ; Tile $8F
    .db $00, $00, $00, $00, $80, $E0, $F8, $0F ; Tile $90
    .db $3F, $1C, $00, $40, $00, $10, $00, $00 ; Tile $91
    .db $00, $00, $00, $09, $3D, $40, $F8, $FC ; Tile $92
    .db $00, $51, $38, $FF, $FF, $7F, $FF, $20 ; Tile $93
    .db $00, $E0, $00, $FF, $FF, $FF, $FF, $7F ; Tile $94
    .db $1F, $1F, $9F, $DF, $DF, $DF, $DF, $CF ; Tile $95
    .db $FF, $FB, $F3, $E3, $FF, $FF, $FF, $FF ; Tile $96
    .db $CF, $CF, $CF, $CF, $DF, $FF, $F4, $F8 ; Tile $97
    .db $BF, $FF, $FF, $E7, $81, $00, $00, $00 ; Tile $98
    .db $FF, $FF, $FF, $FF, $FF, $7F, $7F, $7F ; Tile $99
    .db $F0, $F0, $F0, $F8, $F8, $F8, $F0, $F2 ; Tile $9A
    .db $FF, $FF, $FF, $FF, $FC, $F8, $F0, $E0 ; Tile $9B
    .db $7F, $3F, $3F, $3F, $38, $30, $20, $00 ; Tile $9C
    .db $FF, $FF, $FF, $3F, $0F, $0F, $07, $07 ; Tile $9D
    .db $F6, $F0, $F8, $F0, $F0, $F0, $E8, $80 ; Tile $9E
    .db $01, $01, $01, $01, $00, $00, $00, $00 ; Tile $9F
    .db $FF, $FF, $FF, $FF, $FF, $FE, $FE, $FC ; Tile $A0
    .db $E0, $C0, $80, $04, $0E, $0F, $0E, $0E ; Tile $A1
    .db $07, $07, $07, $06, $04, $20, $30, $20 ; Tile $A2
    .db $80, $00, $00, $08, $08, $00, $00, $00 ; Tile $A3
    .db $FC, $78, $10, $00, $00, $00, $00, $00 ; Tile $A4
    .db $20, $23, $03, $01, $10, $08, $00, $00 ; Tile $A5
    .db $00, $80, $C0, $C0, $40, $10, $10, $10 ; Tile $A6
    .db $00, $00, $00, $00, $00, $00, $01, $03 ; Tile $A7
    .db $00, $00, $01, $07, $7F, $FE, $FC, $F8 ; Tile $A8
    .db $00, $00, $00, $01, $00, $00, $13, $7F ; Tile $A9
    .db $F0, $00, $00, $40, $C7, $73, $FF, $FF ; Tile $AA
    .db $00, $00, $00, $00, $F0, $18, $FF, $FF ; Tile $AB
    .db $00, $01, $07, $1F, $7F, $FF, $FF, $FF ; Tile $AC
    .db $30, $F0, $FE, $FF, $FF, $FF, $FF, $FF ; Tile $AD
    .db $7F, $3F, $3F, $1F, $86, $C3, $E1, $F1 ; Tile $AE
    .db $FF, $FF, $FF, $9F, $07, $FF, $FE, $FE ; Tile $AF
    .db $FC, $FC, $FE, $FE, $FF, $FF, $FF, $FF ; Tile $B0
    .db $FE, $FF, $FF, $7F, $7F, $7F, $3E, $3F ; Tile $B1
    .db $70, $60, $60, $60, $C0, $C0, $C0, $80 ; Tile $B2
    .db $0F, $0F, $0F, $0F, $0F, $0F, $0F, $07 ; Tile $B3
    .db $3F, $BF, $BE, $BC, $F8, $E0, $F0, $E0 ; Tile $B4
    .db $FF, $1F, $07, $03, $03, $03, $03, $01 ; Tile $B5
    .db $80, $80, $80, $80, $00, $00, $00, $00 ; Tile $B6
    .db $0F, $0F, $0F, $1F, $1F, $1F, $1F, $1F ; Tile $B7
    .db $FF, $FE, $FC, $F8, $F0, $E0, $C0, $80 ; Tile $B8
    .db $C7, $87, $82, $02, $02, $82, $04, $04 ; Tile $B9
    .db $1F, $1F, $1F, $1F, $0F, $0F, $0F, $01 ; Tile $BA
    .db $00, $08, $1C, $1E, $3C, $38, $70, $30 ; Tile $BB
    .db $00, $00, $10, $14, $10, $00, $00, $00 ; Tile $BC
    .db $00, $01, $0F, $30, $80, $00, $00, $00 ; Tile $BD
    .db $08, $F0, $C0, $40, $00, $00, $00, $00 ; Tile $BE
    .db $00, $80, $40, $00, $00, $00, $03, $6F ; Tile $BF
    .db $00, $00, $00, $07, $0F, $06, $1E, $7F ; Tile $C0
    .db $C3, $18, $7F, $FF, $FF, $0F, $07, $C3 ; Tile $C1
    .db $07, $0F, $0F, $1F, $1F, $3F, $3F, $3F ; Tile $C2
    .db $80, $80, $C0, $C0, $C0, $C0, $E0, $E0 ; Tile $C3
    .db $01, $07, $0F, $0F, $1F, $1F, $1F, $0F ; Tile $C4
    .db $F5, $F8, $FC, $FE, $FF, $FF, $FF, $FF ; Tile $C5
    .db $C3, $67, $3F, $1F, $1F, $CF, $FF, $F7 ; Tile $C6
    .db $F0, $F0, $F8, $B8, $BC, $BC, $FC, $FE ; Tile $C7
    .db $F0, $F0, $F8, $FC, $FC, $F8, $F0, $E0 ; Tile $C8
    .db $0F, $0F, $07, $07, $03, $00, $00, $00 ; Tile $C9
    .db $F7, $F7, $FB, $FB, $FB, $F9, $FD, $FD ; Tile $CA
    .db $FE, $FE, $FE, $DE, $FF, $EF, $E3, $C3 ; Tile $CB
    .db $7F, $7F, $7F, $7F, $3E, $3C, $3C, $38 ; Tile $CC
    .db $FD, $FD, $FE, $FF, $FF, $FE, $FC, $F8 ; Tile $CD
    .db $C3, $83, $03, $03, $02, $02, $02, $00 ; Tile $CE
    .db $38, $30, $30, $10, $10, $00, $08, $00 ; Tile $CF
    .db $3F, $3F, $3F, $3F, $3F, $7F, $7F, $7F ; Tile $D0
    .db $FF, $FF, $FF, $FF, $FF, $FE, $F8, $F8 ; Tile $D1
    .db $F0, $E0, $C0, $80, $00, $00, $00, $40 ; Tile $D2
    .db $7F, $7F, $7F, $7F, $3C, $00, $00, $00 ; Tile $D3
    .db $F0, $C1, $83, $03, $02, $00, $00, $00 ; Tile $D4
    .db $00, $01, $0F, $3F, $FE, $FF, $FF, $FC ; Tile $D5
    .db $0F, $F0, $FF, $7F, $FF, $FF, $86, $00 ; Tile $D6
    .db $F0, $18, $80, $C3, $C1, $C0, $40, $00 ; Tile $D7
    .db $00, $00, $F0, $F8, $F8, $00, $00, $00 ; Tile $D8
    .db $1C, $10, $20, $20, $20, $20, $00, $00 ; Tile $D9
    .db $60, $40, $80, $00, $80, $00, $40, $00 ; Tile $DA
    .db $08, $0C, $0E, $A5, $21, $0F, $1F, $9F ; Tile $DB
    .db $00, $10, $17, $0F, $0F, $1F, $3F, $7F ; Tile $DC
    .db $00, $00, $80, $C0, $E0, $F0, $F8, $F8 ; Tile $DD
    .db $FF, $FF, $E1, $E0, $FC, $FE, $FF, $FF ; Tile $DE
    .db $F0, $F0, $F8, $E8, $E8, $3C, $1C, $8C ; Tile $DF
    .db $00, $00, $00, $00, $00, $80, $80, $C0 ; Tile $E0
    .db $1F, $3F, $3F, $3F, $3F, $3F, $1F, $1F ; Tile $E1
    .db $CE, $E6, $FE, $FE, $FB, $FA, $FF, $FF ; Tile $E2
    .db $E0, $F0, $F0, $E0, $C0, $80, $00, $00 ; Tile $E3
    .db $1F, $0F, $0F, $03, $00, $00, $00, $00 ; Tile $E4
    .db $FF, $FD, $FD, $FC, $FE, $FE, $FE, $FE ; Tile $E5
    .db $7F, $FF, $FF, $FF, $FC, $E0, $20, $60 ; Tile $E6
    .db $7F, $7F, $7F, $7F, $FF, $FF, $FF, $FF ; Tile $E7
    .db $FC, $F8, $F8, $F0, $F0, $E0, $C0, $80 ; Tile $E8
    .db $60, $60, $20, $10, $00, $00, $00, $04 ; Tile $E9
    .db $01, $01, $03, $03, $07, $07, $0F, $0F ; Tile $EA
    .db $FF, $FF, $FE, $FC, $F9, $F2, $E4, $80 ; Tile $EB
    .db $00, $00, $00, $03, $0F, $1F, $3F, $3F ; Tile $EC
    .db $C0, $F0, $FF, $C0, $C2, $FF, $FF, $3F ; Tile $ED
    .db $00, $00, $80, $CC, $47, $07, $C7, $C7 ; Tile $EE
    .db $7F, $3F, $BF, $3F, $38, $38, $30, $30 ; Tile $EF
    .db $FF, $FF, $FF, $FF, $1F, $0C, $08, $00 ; Tile $F0
    .db $7F, $FF, $FF, $C0, $00, $00, $00, $00 ; Tile $F1
    .db $E0, $E0, $30, $00, $00, $00, $00, $00 ; Tile $F2
    .db $18, $08, $04, $00, $00, $02, $01, $01 ; Tile $F3
    .db $20, $00, $00, $00, $00, $00, $00, $08 ; Tile $F4
    .db $30, $30, $18, $58, $3C, $34, $20, $10 ; Tile $F5
    .db $00, $00, $00, $01, $03, $07, $0F, $0F ; Tile $F6
    .db $7E, $7F, $FF, $FF, $FF, $FF, $FF, $FF ; Tile $F7
    .db $3C, $3E, $7E, $7E, $FF, $FF, $FF, $FF ; Tile $F8
    .db $07, $07, $07, $07, $07, $0F, $1F, $1F ; Tile $F9
    .db $FF, $FF, $FF, $FF, $FE, $F8, $E0, $00 ; Tile $FA
    .db $3E, $1C, $1C, $1C, $38, $38, $30, $70 ; Tile $FB
    .db $3F, $3F, $3C, $38, $38, $30, $00, $02 ; Tile $FC
    .db $FC, $E0, $00, $00, $00, $00, $00, $00 ; Tile $FD
    .db $00, $00, $F8, $F8, $38, $0F, $01, $00 ; Tile $FE

SPRITE_MASK_PATTERNS: ; 12 Sprites x 32 Bytes (16x16)
    ; Sprite TL0 (TL Outer) at X=0, Y=0
    .db $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FE, $FC, $F8, $F8
    .db $FF, $FF, $FF, $FF, $FF, $FC, $F8, $F0, $E0, $C0, $80, $00, $00, $00, $00, $00
    ; Sprite TL1 (TL Top) at X=16, Y=0
    .db $FF, $FE, $F0, $C0, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00
    .db $F0, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00
    ; Sprite TL2 (TL Left) at X=0, Y=16
    .db $F0, $F0, $E0, $E0, $C0, $C0, $C0, $80, $80, $80, $80, $80, $00, $00, $00, $00
    .db $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00
    ; Sprite TR0 (TR Outer) at X=48, Y=0
    .db $FF, $FF, $FF, $FF, $FF, $3F, $1F, $0F, $07, $03, $01, $00, $00, $00, $00, $00
    .db $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $7F, $3F, $1F, $1F
    ; Sprite TR1 (TR Top) at X=32, Y=0
    .db $0F, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00
    .db $FF, $7F, $0F, $03, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00
    ; Sprite TR2 (TR Right) at X=48, Y=16
    .db $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00
    .db $0F, $0F, $07, $07, $03, $03, $03, $01, $01, $01, $01, $01, $00, $00, $00, $00
    ; Sprite BL0 (BL Outer) at X=0, Y=48
    .db $F8, $F8, $FC, $FE, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF
    .db $00, $00, $00, $00, $00, $80, $C0, $E0, $F0, $F8, $FC, $FF, $FF, $FF, $FF, $FF
    ; Sprite BL1 (BL Bottom) at X=16, Y=48
    .db $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $C0, $F0, $FE, $FF
    .db $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $F0
    ; Sprite BL2 (BL Left) at X=0, Y=32
    .db $00, $00, $00, $00, $80, $80, $80, $80, $80, $C0, $C0, $C0, $E0, $E0, $F0, $F0
    .db $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00
    ; Sprite BR0 (BR Outer) at X=48, Y=48
    .db $00, $00, $00, $00, $00, $01, $03, $07, $0F, $1F, $3F, $FF, $FF, $FF, $FF, $FF
    .db $1F, $1F, $3F, $7F, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF
    ; Sprite BR1 (BR Bottom) at X=32, Y=48
    .db $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $0F
    .db $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $03, $0F, $7F, $FF
    ; Sprite BR2 (BR Right) at X=48, Y=32
    .db $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00, $00
    .db $00, $00, $00, $00, $01, $01, $01, $01, $01, $03, $03, $03, $07, $07, $0F, $0F

endif

FRAME_TILEMAPS: ; 12 frames x 64 bytes (8x8 tiles)
FRAME_00H_MAP: ; Hour 00:00
    .db $00, $FF, $FF, $01, $02, $03, $02, $00
    .db $FF, $FF, $FF, $04, $05, $06, $07, $FF
    .db $FF, $FF, $FF, $08, $09, $0A, $FF, $FF
    .db $FF, $FF, $FF, $FF, $0B, $0C, $FF, $0D
    .db $FF, $FF, $FF, $FF, $0E, $05, $0F, $10
    .db $FF, $FF, $FF, $FF, $11, $05, $12, $08
    .db $FF, $FF, $FF, $13, $14, $15, $16, $FF
    .db $00, $17, $18, $19, $FF, $FF, $FF, $00
FRAME_02H_MAP: ; Hour 02:00
    .db $00, $FF, $FF, $FF, $1A, $1B, $1C, $00
    .db $FF, $FF, $FF, $FF, $1D, $05, $1E, $0A
    .db $FF, $FF, $FF, $FF, $FF, $1F, $20, $21
    .db $FF, $FF, $FF, $FF, $FF, $22, $23, $FF
    .db $FF, $FF, $FF, $FF, $FF, $FF, $24, $25
    .db $26, $FF, $FF, $FF, $FF, $FF, $27, $28
    .db $FF, $FF, $FF, $FF, $FF, $29, $05, $02
    .db $00, $04, $2A, $1C, $2B, $2C, $01, $00
FRAME_04H_MAP: ; Hour 04:00
    .db $00, $FF, $2C, $2D, $2E, $2F, $04, $00
    .db $FF, $FF, $FF, $FF, $FF, $30, $31, $27
    .db $32, $FF, $FF, $FF, $FF, $FF, $33, $34
    .db $35, $FF, $FF, $FF, $FF, $FF, $36, $37
    .db $38, $FF, $FF, $FF, $FF, $FF, $FF, $39
    .db $0F, $3A, $FF, $FF, $FF, $FF, $FF, $3B
    .db $FF, $1C, $FF, $FF, $FF, $FF, $0D, $2C
    .db $00, $04, $3C, $1C, $FF, $3D, $35, $00
FRAME_06H_MAP: ; Hour 06:00
    .db $00, $01, $3E, $3F, $40, $41, $0A, $00
    .db $14, $42, $FF, $FF, $FF, $30, $43, $02
    .db $44, $FF, $FF, $FF, $FF, $FF, $FF, $45
    .db $46, $47, $FF, $FF, $FF, $FF, $FF, $48
    .db $49, $4A, $FF, $FF, $FF, $FF, $FF, $30
    .db $FF, $4B, $FF, $FF, $FF, $FF, $FF, $FF
    .db $FF, $4C, $4D, $FF, $FF, $FF, $FF, $FF
    .db $00, $04, $4E, $4F, $FF, $FF, $FF, $00
FRAME_08H_MAP: ; Hour 08:00
    .db $00, $01, $05, $05, $05, $50, $FF, $00
    .db $23, $51, $52, $53, $54, $55, $22, $21
    .db $16, $56, $57, $FF, $FF, $FF, $FF, $FF
    .db $FF, $58, $59, $1C, $FF, $FF, $FF, $FF
    .db $FF, $5A, $5B, $5C, $FF, $FF, $FF, $FF
    .db $FF, $5D, $5E, $5F, $FF, $FF, $FF, $FF
    .db $FF, $4C, $30, $60, $61, $FF, $FF, $FF
    .db $00, $04, $4E, $62, $FF, $FF, $FF, $00
FRAME_10H_MAP: ; Hour 10:00
    .db $00, $01, $63, $05, $02, $64, $0A, $00
    .db $10, $65, $66, $05, $05, $67, $68, $44
    .db $0A, $69, $FF, $6A, $6B, $6C, $FF, $FF
    .db $6D, $FF, $6E, $6F, $70, $FF, $FF, $FF
    .db $FF, $FF, $FF, $30, $71, $1C, $FF, $FF
    .db $FF, $FF, $0D, $72, $02, $73, $FF, $FF
    .db $FF, $4C, $FF, $74, $75, $FF, $FF, $FF
    .db $00, $04, $4E, $62, $76, $77, $FF, $00
FRAME_12H_MAP: ; Hour 12:00
    .db $00, $01, $78, $79, $02, $7A, $0C, $00
    .db $01, $7B, $7C, $7D, $05, $05, $05, $3E
    .db $05, $7E, $FF, $7F, $80, $05, $81, $08
    .db $82, $83, $FF, $84, $1D, $85, $86, $FF
    .db $87, $88, $FF, $FF, $89, $8A, $8B, $FF
    .db $FF, $FF, $FF, $FF, $FF, $8C, $8D, $FF
    .db $FF, $FF, $FF, $FF, $8E, $7D, $8F, $FF
    .db $00, $04, $4E, $90, $FF, $91, $FF, $00
FRAME_14H_MAP: ; Hour 14:00
    .db $00, $56, $92, $93, $94, $1B, $0C, $00
    .db $0D, $05, $05, $95, $96, $05, $05, $02
    .db $30, $05, $05, $97, $98, $99, $05, $9A
    .db $0D, $05, $9B, $16, $FF, $9C, $9D, $9E
    .db $9F, $A0, $A1, $FF, $FF, $FF, $A2, $A3
    .db $FF, $A4, $84, $FF, $FF, $FF, $A5, $A6
    .db $FF, $FF, $FF, $FF, $FF, $A7, $A8, $2A
    .db $00, $04, $4E, $90, $FF, $30, $0A, $00
FRAME_16H_MAP: ; Hour 16:00
    .db $00, $FF, $FF, $A9, $AA, $AB, $8C, $00
    .db $FF, $A7, $AC, $AD, $AE, $AF, $99, $02
    .db $28, $9F, $05, $05, $B0, $B1, $05, $05
    .db $B2, $FF, $B3, $05, $05, $B4, $B5, $05
    .db $B6, $FF, $B7, $05, $B8, $FF, $9F, $B9
    .db $FF, $FF, $BA, $B8, $BB, $FF, $FF, $BC
    .db $FF, $FF, $FF, $FF, $FF, $FF, $FF, $FF
    .db $00, $17, $3C, $90, $FF, $FF, $FF, $00
FRAME_18H_MAP: ; Hour 18:00
    .db $00, $0B, $BD, $BE, $2D, $BF, $1C, $00
    .db $A7, $FF, $FF, $FF, $C0, $C1, $AD, $02
    .db $C2, $C3, $FF, $C4, $05, $C5, $C6, $C7
    .db $99, $C8, $FF, $C9, $7D, $05, $CA, $CB
    .db $CC, $16, $FF, $FF, $11, $05, $CD, $CE
    .db $CF, $FF, $FF, $FF, $D0, $D1, $D2, $FF
    .db $9E, $FF, $FF, $FF, $D3, $D4, $16, $FF
    .db $00, $17, $2A, $62, $FF, $FF, $FF, $00
FRAME_20H_MAP: ; Hour 20:00
    .db $00, $01, $D5, $D6, $D7, $D8, $FF, $00
    .db $FF, $D9, $DA, $FF, $FF, $FF, $DB, $02
    .db $FF, $DC, $DD, $FF, $FF, $13, $DE, $DF
    .db $FF, $05, $B0, $E0, $FF, $E1, $05, $E2
    .db $FF, $99, $05, $E3, $FF, $E4, $99, $E5
    .db $FF, $E6, $16, $FF, $FF, $FF, $E7, $E8
    .db $FF, $E9, $FF, $FF, $FF, $EA, $EB, $03
    .db $00, $06, $7A, $4F, $FF, $55, $FF, $00
FRAME_22H_MAP: ; Hour 22:00
    .db $00, $FF, $EC, $05, $ED, $EE, $73, $00
    .db $FF, $FF, $EF, $F0, $F1, $F2, $FF, $E6
    .db $FF, $FF, $F3, $F4, $FF, $FF, $FF, $F5
    .db $FF, $FF, $F6, $F7, $DD, $FF, $0D, $F8
    .db $FF, $FF, $B3, $05, $B0, $83, $9F, $05
    .db $FF, $FF, $F9, $05, $FA, $16, $FF, $FB
    .db $FF, $FF, $FC, $FD, $FF, $FF, $13, $7C
    .db $00, $17, $FE, $4F, $FF, $FF, $27, $00

; HL = compact 8x8 tile map. PUT_FRAME handles the 32-column Name Table stride.
EarthDrawFrame:
    ld b,8
    ld c,8
    ld d,8
    ld e,12
    push ix
    push iy
    call PUT_FRAME
    pop iy
    pop ix
    ret
