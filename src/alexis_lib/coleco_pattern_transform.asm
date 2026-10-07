; -----------------------------------------------------------------------------
; ALEXIS pattern transform helpers
; -----------------------------------------------------------------------------

; BIOS graphic transform helpers use the ROM header work buffer pointer.
; Amy sets that pointer to AMY_BUFFER32/$7000 in the generated cartridge header.
; Input: DE = source pattern index, HL = destination pattern index, BC = count.

AMY_REFLECT_PATTERN_VERTICAL:
    push ix
    push iy
    ld a,3
    call $1F6A
    pop iy
    pop ix
    ret

AMY_REFLECT_PATTERN_HORIZONTAL:
    push ix
    push iy
    push bc
    push de
    push hl
    ld a,3
    call $1F6D
    pop hl
    pop de
    pop bc
    ; OS7's Graphics II color path reverses the bytes into WORK_BUFFER+8 but
    ; PUT_COLOR mistakenly uploads WORK_BUFFER. Flip the color table directly.
    ld a,4
    call $1F6D
    pop iy
    pop ix
    ret

AMY_ROTATE_PATTERN_90:
    push ix
    push iy
    ld a,3
    call ROTATE_90
    pop iy
    pop ix
    ret

; Internal exploration wrapper. The caller must own a VRAM critical section.
; One source pattern produces four consecutive destination patterns.
AMY_ENLARGE_PATTERN:
    push ix
    push iy
    ld a,3
    call $1F73
    pop iy
    pop ix
    ret
