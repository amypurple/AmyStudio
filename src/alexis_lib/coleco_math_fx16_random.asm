; -----------------------------------------------------------------------------
; ALEXIS fixed-point 16.16 random helper
; Depends on: coleco_math_fx16_core.asm (scratch aliases)
; -----------------------------------------------------------------------------

; 16.16 random: return 0..~1.0 in LEFT32
; Output: AMY_CMP_LEFT32 = 0.0 .. 0.9999...
; Notes:
;   - uses a local 16-bit xorshift state in legacy_random_seed
;   - zero state is remapped to a non-zero constant to avoid lock-up
AMY_FX16_16_RND:
    ld hl,(legacy_random_seed)
    ld a,h
    or l
    jr nz,AMY_FX16_16_RND_HAVE_SEED
    ld hl,$1D3F
AMY_FX16_16_RND_HAVE_SEED:
    ; x ^= x << 7
    ld d,h
    ld e,l
    sla e
    rl d
    sla e
    rl d
    sla e
    rl d
    sla e
    rl d
    sla e
    rl d
    sla e
    rl d
    sla e
    rl d
    ld a,l
    xor e
    ld l,a
    ld a,h
    xor d
    ld h,a

    ; x ^= x >> 9
    ld d,h
    ld e,l
    srl d
    rr e
    srl d
    rr e
    srl d
    rr e
    srl d
    rr e
    srl d
    rr e
    srl d
    rr e
    srl d
    rr e
    srl d
    rr e
    srl d
    rr e
    ld a,l
    xor e
    ld l,a
    ld a,h
    xor d
    ld h,a

    ; x ^= x << 8
    ld a,h
    xor l
    ld h,a

    ld (legacy_random_seed),hl
    ld a,l
    ld (AMY_BUFFER32+0),a
    ld a,h
    ld (AMY_BUFFER32+1),a
    xor a
    ld (AMY_BUFFER32+2),a
    ld (AMY_BUFFER32+3),a
    ret
