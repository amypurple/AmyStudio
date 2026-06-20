; -----------------------------------------------------------------------------
; ALEXIS Mode 3 multicolor pixel helpers
; -----------------------------------------------------------------------------

AMY_MODE3_CALC_COLOR_ADDRESS:
    ; Mode 3 pattern byte address: addr = N*8 + R
    ; N = (y>>3)*32 + (x>>1), R = y&7. Equivalent: (y>>3)*256 + (x>>1)*8 + (y&7).
    ; Input: B = x (0..63), C = y (0..47). Output: HL = VRAM address.
    ld a,c
    and 7
    ld l,a           ; L = y & 7
    ld a,c
    sub l            ; A = y & ~7
    rrca
    rrca
    rrca             ; A = y >> 3
    ld h,a           ; H = y >> 3
    ld a,b
    and $3E          ; A = x & $3E  (= 2*(x>>1))
    add a,a          ; A = (x>>1)*4
    add a,a          ; A = (x>>1)*8
    add a,l          ; A = (x>>1)*8 + (y&7)
    ld l,a
    ret

AMY_MODE3_PSET:
    ; Bounds check: x must be 0..63, y must be 0..47. Out of range = silent no-op.
    ld e,a          ; save color (VPEEK preserves DE, so E survives through PSET_FAST)
    ld a,b
    cp 64
    ret nc
    ld a,c
    cp 48
    ret nc
    ld a,e          ; restore color before PSET_FAST entry
AMY_MODE3_PSET_FAST:
    ; Set one Mode 3 multicolor pixel nibble. No bounds check — caller guarantees x<64, y<48.
    ; Input: B = x, C = y, A = color nibble.
    and $0F
    push af
    push bc
    call AMY_MODE3_CALC_COLOR_ADDRESS
    push hl
    call AMY_VPEEK
    pop hl
    pop bc
    ld d,a
    pop af
    ld e,a
    ld a,d
    bit 0,b
    jr nz,MODE3_PSET_LOW
    and $0F
    ld d,a
    ld a,e
    add a,a
    add a,a
    add a,a
    add a,a
    or d
    jp AMY_VPOKE
MODE3_PSET_LOW:
    and $F0
    or e
    jp AMY_VPOKE

AMY_MODE3_PGET:
    ; Read one Mode 3 multicolor pixel nibble.
    ; Input: B = x, C = y. Output: A = color nibble.
    push bc
    call AMY_MODE3_CALC_COLOR_ADDRESS
    call AMY_VPEEK
    pop bc
    bit 0,b
    jr nz,MODE3_PGET_LOW
    rrca
    rrca
    rrca
    rrca
MODE3_PGET_LOW:
    and $0F
    ret
