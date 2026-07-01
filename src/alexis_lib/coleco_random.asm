; -----------------------------------------------------------------------------
; Amy byte random helper
; -----------------------------------------------------------------------------

; Random byte in A.
; Uses the ColecoVision BIOS random seed at $73C8. If the seed is zero, Amy
; initializes it once so the BIOS LFSR cannot stay locked at zero. The final
; byte keeps the legacy devkit mix: BIOS random LSB XOR Z80 refresh register R.
AMY_RANDOM_U8:
    ld hl,(legacy_random_seed)
    ld a,h
    or l
    jr nz,AMY_RANDOM_U8_SEEDED
    ld hl,$1D3F
    ld (legacy_random_seed),hl
AMY_RANDOM_U8_SEEDED:
    call GET_RANDOM
    ld a,r
    xor l
    ret