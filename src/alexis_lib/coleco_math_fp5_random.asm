; -----------------------------------------------------------------------------
; ALEXIS fp5 random helper
; -----------------------------------------------------------------------------

; Random float in range 0.0 .. <1.0 in FPA1.
; Uses same 16-bit xorshift seed family as fixed32 random.
AMY_FP5_RND:
    ld hl,(legacy_random_seed)
    ld a,h
    or l
    jr nz,AMY_FP5_RND_HAVE_SEED
    ld hl,$1D3F
AMY_FP5_RND_HAVE_SEED:
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
    call AMY_FP5_U16_TO_FPA1
    ld a,(AMY_FP5_FPA1+4)
    or a
    ret z
    sub 16
    ld (AMY_FP5_FPA1+4),a
    ret






