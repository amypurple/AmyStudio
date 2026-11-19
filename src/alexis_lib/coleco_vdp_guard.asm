; -----------------------------------------------------------------------------
; Amy VDP critical-section release
; -----------------------------------------------------------------------------
; $701F=$A5 means a fragile VDP control/data sequence is active.
; If an NMI arrives, it sets VDP_GUARD_PENDING without reading VDP status,
; preserving the two-byte VDP address latch. Release opens the guard first,
; then acknowledges the deferred interrupt without a lost-update race.

AMY_RELEASE_VDP_GUARD:
    xor a
    ld ($701F),a
    ld a,(VDP_GUARD_PENDING)
    or a
    ret z
    xor a
    ld (VDP_GUARD_PENDING),a
    in a,(VDP_CTRL_PORT)
    ld (NMI_FLAG),a
    ld (VDP_STATUS),a
    ret
