; =============================================================================
; LZF-Coleco.asm - LZF Decompression Routine for ColecoVision
; =============================================================================
; Modified LZF compression by Tom Dalby (2020) for ZX Spectrum
; Z80 decompressor code for ColecoVision VDP with proper I/O sequencing
; =============================================================================
; IN: HL -> Source compressed data
;     DE -> Destination VRAM address
; =============================================================================
; Timing note:
; - Literal writes are already compact.
; - The match-copy loop keeps its full NOP spacing for now because the routine
;   hops from VRAM read mode back to VRAM write mode on every byte.
; - Future optimization candidate: count whether some of the NOPs around the
;   read->write retarget are redundant once the surrounding instructions are included.

lzf_decompress:
    call    lzf_set_write_addr

lzf_main_loop:
    ; Get control byte
    ld      a, (hl)
    inc     hl
    cp      $ff         ; Check for end marker
    ret     z           ; End of data

    push    af
    and     $e0         ; Get top 3 bits
    or      a
    ; Check for literal (top 3 bits = 000)
    jr      nz, lzf_handle_match

    ; Literal: 000LLLLL (1-32 bytes)
    pop     af    
    and     $1f         ; Get length (0-31)
    inc     a           ; Convert to 1-32
    ld      b, a        ; B = literal length
    
lzf_copy_literal:
    ; Copy literal bytes directly to VDP
    ld      a, (hl)
    inc     hl
    out     ($be), a      ; Write to VDP
    inc     de
    djnz    lzf_copy_literal
    jr      lzf_main_loop

lzf_handle_match:
    ld      b, 0
    ; Check for long match (top 3 bits = 111)
    cp      $e0
    jr      z, lzf_handle_long_match
    ; Short match: LLLPPPPP
    rlca
    rlca
    rlca
    inc     a
    inc     a
    ld      c, a        ; C = match length
    jr      lzf_handle_offset

lzf_handle_long_match:
    ; Long match: 111PPPPP LLLLLLLL PPPPPPPP
    ; Extract offset high byte (PPPPP)
    ; Get length byte (LLLLLLLL)
    ld      a, (hl)
    inc     hl
    add     a, 9        ; Length = LLLLLLLL + 9
    ld      c, a
    jr      nc, lzf_handle_offset
    inc     b

lzf_handle_offset:
    ; Extract offset (PPPPP + PPPPPPPP)
    pop     af
    and     $1F
    ex      af, af'
    ld      a, (hl)
    inc     hl
    push    hl
    push    de
    ld      e, a        ; Low byte of offset
    ex      af, af'
    ld      d, a        ; high byte of offset
    pop     hl
    
    ; Calculate source address = DE - HL
    push    hl          
    scf
    sbc     hl,de
    pop     de
    set     6, d
            
lzf_copy_loop:
    push    bc
    ld      c, $bf      ; VDP control port

    ; Set read address at DE (source)
    out (c), l
    nop
    out (c), h
    inc hl
    nop
    nop
    in a, ($BE)
    nop
    nop
    nop
    
    ; Set write address at HL (destination)
    out     (c), e      ; Low byte of destination
    nop
    out     (c), d      ; High byte of destination
    inc     de          ; Next destination byte
    nop
    nop
    out     ($be), a    ; Write the byte
    
    ; Decrement counter and loop
    pop     bc          ; Get counter
    dec     bc          ; Decrement
    ld      a, b
    or      c
    jr      nz, lzf_copy_loop
    res     6, d    
    pop     hl
    jr      lzf_main_loop

lzf_set_write_addr:
    ld      c, $bf
    out     (c), e
    set     6, d
    out     (c), d
    res     6, d
    ret
