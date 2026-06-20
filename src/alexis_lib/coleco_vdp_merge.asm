; -----------------------------------------------------------------------------
; ALEXIS masked VRAM merge helper
; -----------------------------------------------------------------------------

; Copy BC bytes from HL to the already-selected VRAM write port while transforming each byte:
;   output = (source & D) xor E
; Input: HL = source bytes, BC = byte count, D = AND mask, E = XOR value.
AMY_MERGE_BYTES_TO_VRAM:
MERGE_BYTES_TO_VRAM_LOOP:
    ld a,b
    or c
    ret z
    ld a,(hl)
    and d
    xor e
    out (VDP_DATA_PORT),a
    nop
    inc hl
    dec bc
    jr MERGE_BYTES_TO_VRAM_LOOP
