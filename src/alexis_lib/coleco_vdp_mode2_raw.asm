; -----------------------------------------------------------------------------
; Raw Graphics II tables with independent pattern/color thirds.
; -----------------------------------------------------------------------------
; Unlike the text-oriented Mode 2 helper, R3=$FF exposes the complete 6 KB
; color table at $2000-$37FF, matching `mode 2 screen` language semantics.
AMY_SET_GRAPHICS_MODE2_RAW:
    ld bc,$0182
    call WRITE_REGISTER
    ld bc,$03FF
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
