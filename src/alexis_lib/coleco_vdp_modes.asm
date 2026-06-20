; -----------------------------------------------------------------------------
; ALEXIS VDP mode and table-layout helpers
; -----------------------------------------------------------------------------

; Configure TMS9918A/TMS9928A bitmap Graphics II layout used by the picture demos.
; Display stays blanked until screen on is called.
; Effects:
;   R0 = $02
;   BIOS INIT_TABLE(A=2, HL=$1800) updates the name-table base/shadows
;   R3 = $FF
;   R4 = $03
;   R5 = $36
;   R6 = $07
AMY_SET_BITMAP_GRAPHICS_MODE:
    ld bc,$0182
    call WRITE_REGISTER
    ld a,$82
    ld ($73C4),a
    ld bc,$0002
    call WRITE_REGISTER
    ld a,2
    ld hl,VRAM_NAME
    call INIT_TABLE
    ld bc,$03FF
    call WRITE_REGISTER
    ld bc,$0403
    call WRITE_REGISTER
    ld bc,$0536
    call WRITE_REGISTER
    ld bc,$0607
    call WRITE_REGISTER
    ld bc,$0701
    jp WRITE_REGISTER

; Configure Graphics II text-style layout inspired by getput11/gpscrmo1.s.
; This keeps the Mode 2 pattern generator setup but uses R3=$9F instead of
; R3=$FF, matching the old text-oriented helper. Sprite helpers expect the
; standard Coleco sprite tables at VRAM_SPR_ATTR=$1B00 and VRAM_SPR_PAT=$3800.
; Display stays blanked until screen on is called.
AMY_SET_GRAPHICS_MODE2_TEXT:
    ld bc,$0182
    call WRITE_REGISTER
    ld bc,$039F
    call WRITE_REGISTER
    ld bc,$0403
    call WRITE_REGISTER
    ld bc,$0536
    call WRITE_REGISTER
    ld bc,$0607
    call WRITE_REGISTER
    ld bc,$0002
    call WRITE_REGISTER
    ld a,2
    ld hl,VRAM_NAME
    jp INIT_TABLE

; Configure standard text mode (Mode 1) with the default name table at $1800.
; Display remains blanked until screen on is called.
AMY_SET_GRAPHICS_MODE1_TEXT:
    ld bc,$0000
    call WRITE_REGISTER
    ld bc,$0182
    call WRITE_REGISTER
    ld bc,$0380
    call WRITE_REGISTER
    ld bc,$0400
    call WRITE_REGISTER
    ld bc,$0536
    call WRITE_REGISTER
    ld bc,$0607
    call WRITE_REGISTER
    ld hl,VRAM_NAME
    call AMY_SET_DEFAULT_NAME_TABLE
    ld de,$0300
    ld a,$20
    jp AMY_FILL_VRAM

; Configure multicolor mode (Mode 3) and initialize the name table so each
; 4-row band points at the same 32 pattern entries.
; Display stays blanked until screen on is called.
AMY_SET_GRAPHICS_MODE3_MULTICOLOR:
    ld bc,$0000
    call WRITE_REGISTER
    ld bc,$018A
    call WRITE_REGISTER
    ld bc,$0380
    call WRITE_REGISTER
    ld bc,$0400
    call WRITE_REGISTER
    ld bc,$0536
    call WRITE_REGISTER
    ld bc,$0607
    call WRITE_REGISTER
    ld hl,VRAM_NAME
    call AMY_SET_DEFAULT_NAME_TABLE
    jp LOAD_MULTICOLOR_NAME_TABLE

LOAD_MULTICOLOR_NAME_TABLE:
    xor a
    out (VDP_CTRL_PORT),a
    ld a,$58
    out (VDP_CTRL_PORT),a
    xor a
    ld h,$06
LOAD_MULTICOLOR_NAME_BAND:
    ld d,$04
LOAD_MULTICOLOR_NAME_ROW:
    ld e,$20
LOAD_MULTICOLOR_NAME_BYTE:
    out (VDP_DATA_PORT),a
    nop
    inc a
    dec e
    jr nz,LOAD_MULTICOLOR_NAME_BYTE
    ld e,$E0
    add a,e
    dec d
    jr nz,LOAD_MULTICOLOR_NAME_ROW
    ld e,$20
    add a,e
    dec h
    jr nz,LOAD_MULTICOLOR_NAME_BAND
    ret

; Configure the CVBasic-style bitmap drawing surface used by MODE 1 on Coleco.
; Input: A = full color-table byte, typically $F0.
AMY_SET_GRAPHICS_MODE1_BITMAP:
    push af
    call AMY_SET_BITMAP_GRAPHICS_MODE
    ld hl,$0000
    ld de,$1800
    xor a
    call AMY_FILL_VRAM
    pop af
    ld hl,$2000
    ld de,$1800
    call AMY_FILL_VRAM
    ld d,$03
    jp AMY_LOAD_SEQUENTIAL_NAME_TABLE

; Fill only the first third ($0800 bytes) of the Mode 2 text color table.
; Input: A = color byte, e.g. $F1 for white on black/blue depending palette.
AMY_FILL_MODE2_TEXT_COLOR_FIRST_THIRD:
    ld hl,VRAM_COLOR
    ld de,$0800
    jp FILL_VRAM

; Duplicate the first color third into the second and third thirds using a
; 32-byte RAM buffer.
AMY_DUPLICATE_COLOR_THIRDS:
    ld bc,($73C4)
    ld b,1
    push bc
    ld c,$80
    call WRITE_REGISTER
    ld hl,($73FA)
    ld b,$40
AMY_DUPLICATE_COLOR_THIRDS_LOOP:
    push bc
    push hl
    ld a,l
    out (VDP_CTRL_PORT),a
    ld a,h
    out (VDP_CTRL_PORT),a
    ld bc,$20BE
    ld hl,AMY_BUFFER32
    inir
    pop hl
    push hl
    ld de,$0800
    add hl,de
    ld a,l
    out (VDP_CTRL_PORT),a
    ld a,h
    or $40
    out (VDP_CTRL_PORT),a
    ld bc,$20BE
    ld hl,AMY_BUFFER32
    otir
    pop hl
    push hl
    ld de,$1000
    add hl,de
    ld a,l
    out (VDP_CTRL_PORT),a
    ld a,h
    or $40
    out (VDP_CTRL_PORT),a
    ld bc,$20BE
    ld hl,AMY_BUFFER32
    otir
    pop hl
    ld de,$0020
    add hl,de
    pop bc
    djnz AMY_DUPLICATE_COLOR_THIRDS_LOOP
    pop bc
    jp WRITE_REGISTER

; Fill the first third, then duplicate it to the other two thirds.
AMY_FILL_MODE2_TEXT_COLOR:
    call AMY_FILL_MODE2_TEXT_COLOR_FIRST_THIRD
    jp AMY_DUPLICATE_COLOR_THIRDS

; Fill the full three-third Mode 2 text color area directly.
AMY_FILL_MODE2_TEXT_COLOR_FULL:
    ld hl,VRAM_COLOR
    ld de,$1800
    jp FILL_VRAM

; Duplicate the first pattern third into the second and third thirds using the
; original lib4ksa _duplicate_pattern approach and the 32-byte scratch buffer.
AMY_DUPLICATE_PATTERN_THIRDS:
    ld bc,($73C4)
    ld b,1
    push bc
    ld c,$80
    call WRITE_REGISTER
    ld hl,($73F8)
    ld b,$80
AMY_DUPLICATE_PATTERN_THIRDS_LOOP:
    push bc
    ld a,l
    out (VDP_CTRL_PORT),a
    ld a,h
    out (VDP_CTRL_PORT),a
    push hl
    ld bc,$20BE
    ld hl,AMY_BUFFER32
    inir
    pop hl
    ld de,$4800
    add hl,de
    ld a,l
    out (VDP_CTRL_PORT),a
    ld a,h
    out (VDP_CTRL_PORT),a
    ld de,$B820
    add hl,de
    push hl
    ld bc,$20BE
    ld hl,AMY_BUFFER32
    otir
    pop hl
    pop bc
    djnz AMY_DUPLICATE_PATTERN_THIRDS_LOOP
    pop bc
    jp WRITE_REGISTER
