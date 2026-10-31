; -----------------------------------------------------------------------------
; Amy byte random helper
; -----------------------------------------------------------------------------

; Random byte in A.
; Uses the ColecoVision BIOS random seed at $73C8. If the seed is zero, Amy
; initializes it once so the BIOS LFSR cannot stay locked at zero. R is mixed
; only into that fallback seed: mixing it into every result creates short,
; timing-dependent correlations in tight loops.
AMY_RANDOM_U8:
    ld hl,(legacy_random_seed)
    ld a,h
    or l
    jr nz,AMY_RANDOM_U8_SEEDED
    ld a,r
    ld l,a
    ld h,$1D
    ld (legacy_random_seed),hl
AMY_RANDOM_U8_SEEDED:
    call GET_RANDOM
    ret
