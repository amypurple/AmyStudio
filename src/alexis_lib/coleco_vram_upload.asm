; -----------------------------------------------------------------------------
; ALEXIS VRAM upload critical-section helpers
;
; AMY_VRAM_BEGIN saves the current BIOS VDP register 1 shadow on the caller's
; stack, disables NMI, and returns with that saved word left below the stack top.
; AMY_VRAM_END consumes that saved word, restores the shadow/register, and
; acknowledges pending VDP status if NMI was originally enabled.
;
; This deliberately mirrors the old inline wrapper contract without requiring a
; RAM scratch byte.
; -----------------------------------------------------------------------------

AMY_VRAM_BEGIN:
    pop hl                  ; caller return address
    ld a,($73C4)
    push af                 ; saved original R1 shadow for AMY_VRAM_END
    push hl
    and $DF
    ld ($73C4),a
    ld c,a
    ld b,1
    call WRITE_REGISTER
    ret

AMY_VRAM_END:
    pop hl                  ; caller return address
    pop af                  ; original R1 shadow saved by AMY_VRAM_BEGIN
    ld ($73C4),a
    push af
    push hl
    ld c,a
    ld b,1
    call WRITE_REGISTER
    pop hl
    pop af
    and $20
    jr z,AMY_VRAM_END_DONE
    push hl
    call READ_REGISTER
    ei
    pop hl
AMY_VRAM_END_DONE:
    jp (hl)
