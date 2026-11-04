; -----------------------------------------------------------------------------
; ALEXIS text/name-table address helpers
; -----------------------------------------------------------------------------

AMY_BUFFER32    EQU $7000

; Clear the name table with ASCII space ($20).
AMY_CLEAR_NAME_TABLE:
    ld hl,($73F6)
    ld de,$0300
    ld a,$20
    jp FILL_VRAM

; Load the complete Coleco BIOS default ASCII font into VRAM.
; Stock OS7 stops at $7C even though glyphs $7D-$7F follow in ROM.
AMY_LOAD_DEFAULT_ASCII:
    call LOAD_ASCII
    ld hl,($73F8)
    ld de,$03E8
    add hl,de
    ex de,hl
    ld hl,$188B
    ld bc,$0118
    jp WRITE_VRAM

; Calculate a NAME-table VRAM address from x/y coordinates.
; Matches getput11/gpcaloff.s:
;   - BIOS CALC_OFFSET computes y*32 + x in DE
;   - BIOS shadow $73F6 provides the current NAME table base
; Input: D = y, E = x
; Output: HL = NAME + y*32 + x
AMY_TEXT_CALC_NAME_ADDRESS:
    call CALC_OFFSET
    ld hl,($73F6)
    add hl,de
    ret
