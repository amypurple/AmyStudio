; =============================================================================
; BITBUSTER.ASM - BitBuster v1.2 VRAM Depacker v1.1 - 16Kb version
; =============================================================================
; LZSS Compression by ARJAN BAKKER (2003)
;      Decompression to VRAM by Amy Bienvenu (2013)
; =============================================================================
; IN: HL -> Source compressed data
;     DE -> Destination VRAM address
; =============================================================================
; Timing note:
; - The match-copy loop keeps all NOPs because this version uses direct port I/O
;   rather than the shared vdp_set_* helpers and is easy to destabilize.
; - Future optimization candidate: re-count the gap before OUT ($BE),A after the
;   write address setup, but only with hardware validation.

bitbuster_decompress:

; VRAM address setup
    ld  a,e
    out ($bf),a
    ld  a,d
    or  $40
    out ($bf),a

; Skip 4-byte data header
    inc hl
    inc hl
    inc hl
    inc hl

; Init: bit buffer and alt regs
    ld  a,$80
    exx
    ld  de,$0001
    exx

; -------------------------------
; Main depack loop
; -------------------------------
bitbuster_main_loop:
    add a,a
    jp  nz,bitbuster_have_bit
    ld  a,(hl)
    inc hl
    rla
bitbuster_have_bit:
    jp  c,bitbuster_do_match           ; C=1 -> compressed match; C=0 -> literal
    ld  c,$be                ; literal byte to VRAM
    outi
    inc de
    jp  bitbuster_main_loop

; -------------------------------
; Compressed match token
; -------------------------------
bitbuster_do_match:
    ld  c,(hl)               ; low 7 bits (C) + possible ext bits in B
    inc hl
bitbuster_read_offset:
    ld  b,0
    bit 7,c
    jr  z,bitbuster_ofs_done           ; no ext bits
    add a,a
    jp  nz,bitbuster_ofs_more1
    ld  a,(hl)
    inc hl
    rla
bitbuster_ofs_more1:
    rl  b
    add a,a
    jp  nz,bitbuster_ofs_more2
    ld  a,(hl)
    inc hl
    rla
bitbuster_ofs_more2:
    rl  b
    add a,a
    jp  nz,bitbuster_ofs_more3
    ld  a,(hl)
    inc hl
    rla
bitbuster_ofs_more3:
    rl  b
    add a,a
    jp  nz,bitbuster_ofs_check
    ld  a,(hl)
    inc hl
    rla
bitbuster_ofs_check:
    jp  c,bitbuster_ofs_done
    res 7,c
bitbuster_ofs_done:
    inc bc                   ; BC = offset (C low, B high ext)

    ; Prepare Elias-gamma length decode
    exx
    ld  h,d
    ld  l,e
    ld  b,e                  ; B = prefix count

; -------------------------------
; Elias-gamma decode of length
; -------------------------------
bitbuster_gamma_pfx_loop:
    exx
    add a,a
    jp  nz,bitbuster_gamma_refill1
    ld  a,(hl)
    inc hl
    rla
bitbuster_gamma_refill1:
    exx
    jp  nc,gamma_len_done    ; stop when a '0' encountered
    inc b
    jp  bitbuster_gamma_pfx_loop

bitbuster_gamma_shift_loop:
    exx
    add a,a
    jp  nz,gamma_refill2
    ld  a,(hl)
    inc hl
    rla
gamma_refill2:
    exx
    adc hl,hl
gamma_len_done:
    djnz    bitbuster_gamma_shift_loop
; gamma_finish
    inc hl
    exx

    ret  c             ; early exit if needed

    ; Compute VRAM copy src = DE - BC, preserve state
    push hl
    exx
    push hl
    exx
    ld  h,d
    ld  l,e
    sbc hl,bc                ; HL = DE - offset
    pop bc
    push af

; -------------------------------
; VRAM → VRAM copy loop (match)
; -------------------------------
bitbuster_copy_loop_vram:
    ; set VDP read address (HL)
    ld  a,l
    out ($bf),a
    ld  a,h
    nop                      ; VDP timing
    out ($bf),a
    nop                      ; VDP timing

    in  a,($be)              ; read byte from VRAM

    ex  af,af'

    ; set VDP write address (DE)
    ld  a,e
    nop                      ; VDP timing
    out ($bf),a
    ld  a,d
    or  $40
    out ($bf),a

    ex  af,af'

    nop                      ; VDP timing
    out ($be),a              ; write byte to VRAM

    inc de
    cpi                      ; HL++, A compared to (HL before), affects PE
    jp  pe,bitbuster_copy_loop_vram

    pop af
    pop hl
    jp  bitbuster_main_loop
