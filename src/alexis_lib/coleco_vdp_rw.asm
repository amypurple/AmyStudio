; -----------------------------------------------------------------------------
; ALEXIS VDP byte-level read/write helpers
; -----------------------------------------------------------------------------

; Copy BC bytes from ROM/RAM at HL to VRAM address DE.
; Applies the _WrtVRAM count bug fix: if C!=0, inc B before calling WRITE_VRAM.
AMY_COPY_BYTES_TO_VRAM:
    ld a,c
    or a
    jp z,WRITE_VRAM
    inc b
    jp WRITE_VRAM

; Write one byte to VRAM. Input: HL=VRAM address, A=value.
AMY_VPOKE:
    ld e,a
    ld a,$A5
    ld ($701F),a
    ld a,l
    out (VDP_CTRL_PORT),a
    ld a,h
    or $40
    out (VDP_CTRL_PORT),a
    ld a,e
    out (VDP_DATA_PORT),a
    nop
    xor a
    ld ($701F),a
    ret

; Read one byte from VRAM. Input: HL=VRAM address. Output: A=value.
AMY_VPEEK:
    ld a,$A5
    ld ($701F),a
    ld a,l
    out (VDP_CTRL_PORT),a
    ld a,h
    and $3F
    out (VDP_CTRL_PORT),a
    ex (sp),hl
    ex (sp),hl
    in a,(VDP_DATA_PORT)
    push af
    xor a
    ld ($701F),a
    pop af
    ret
