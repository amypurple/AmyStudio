; -----------------------------------------------------------------------------
; ALEXIS pattern transform helpers
; -----------------------------------------------------------------------------

; BIOS graphic transform helpers use the ROM header work buffer pointer.
; Amy sets that pointer to AMY_BUFFER32/$7000 in the generated cartridge header.
; Input: DE = source pattern index, HL = destination pattern index, BC = count.

AMY_REFLECT_PATTERN_VERTICAL:
    push ix
    ld a,3
    call $1F6A
    pop ix
    ret

AMY_REFLECT_PATTERN_HORIZONTAL:
    push ix
    ld a,3
    call $1F6D
    pop ix
    ret

AMY_ROTATE_PATTERN_90:
    push ix
    ld a,3
    call ROTATE_90
    pop ix
    ret
