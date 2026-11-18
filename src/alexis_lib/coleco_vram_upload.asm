; -----------------------------------------------------------------------------
; ALEXIS VRAM upload critical-section helpers
;
; AMY_VRAM_BEGIN saves the current BIOS VDP register 1 shadow on the caller's
; stack, disables NMI, and returns with that saved word left below the stack top.
; AMY_VRAM_END consumes that saved word, restores the shadow/register, and
; leaves pending VDP status latched if NMI was originally enabled, allowing the
; VDP to deliver that VBlank immediately after interrupt enable is restored.
;
; This deliberately mirrors the old inline wrapper contract without requiring a
; RAM scratch byte.
; -----------------------------------------------------------------------------

AMY_VRAM_BEGIN:
    pop hl                  ; caller return address
    di
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
    ld c,a
    ld b,1
    call WRITE_REGISTER
    ld a,($73C4)
    and $20
    jr z,AMY_VRAM_END_DONE
    ei
AMY_VRAM_END_DONE:
    jp (hl)
