; =============================================================================
; MDKRLE.asm - MDK-RLE Decompression Routine
; =============================================================================
; RLE compression by Marcel de Kogel (1998)
; Z80 decompressor code is required here.
; =============================================================================
; IN: HL -> Source compressed data
;     DE -> Destination VRAM address
; =============================================================================
; Notes:
; - The raw-byte loop used to carry two NOPs after each VRAM data write.
; - They are commented out, not deleted: DJNZ already spaces the next OUT, but
;   keeping the old timing visible makes hardware re-checks easier.
; - Future optimization candidate: test whether the RLE path can also use a
;   tighter loop shape without stressing the VDP data port.
mdkrle_decompress:
    call    mdkrle_set_write_addr
    ld      c, $be
mdkrle_main_loop:
    ld      a,(hl)
    inc     hl
    cp      $ff
    ret     z
    bit     7,a
    jr      z,mdkrle_handle_rle
    and     $7f
    inc     a
    ld      b,a
    ld      a,(hl)
    inc     hl
mdkrle_handle_raw_loop:
    out     (c),a
    ; nop                         ; judged redundant: DJNZ already leaves a wide gap before next OUT
    ; nop                         ; judged redundant: DJNZ already leaves a wide gap before next OUT
    djnz    mdkrle_handle_raw_loop
    jr      mdkrle_main_loop
mdkrle_handle_rle:
    inc     a
    ld      b,a
mdkrle_handle_rle_loop:
    outi
    jr      z, mdkrle_main_loop
    jp      mdkrle_handle_rle_loop

mdkrle_set_write_addr:
    ld      c, $bf
    out     (c), e
    set     6, d
    out     (c), d
    res     6, d
    ret
