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

; Load the Coleco BIOS default ASCII font into VRAM.
AMY_LOAD_DEFAULT_ASCII:
    jp LOAD_ASCII

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
