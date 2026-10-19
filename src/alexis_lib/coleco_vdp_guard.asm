; -----------------------------------------------------------------------------
; Amy VDP critical-section release
; -----------------------------------------------------------------------------
; $701F=$A5 means a fragile VDP control/data sequence is active.
; If an NMI arrives, it changes the marker to $5A without reading VDP status,
; preserving the two-byte VDP address latch. Release then acknowledges the
; deferred interrupt and updates the same shadows as the generated NMI.

AMY_RELEASE_VDP_GUARD:
    ld a,($701F)
    cp $5A
    jr nz,AMY_RELEASE_VDP_GUARD_CLEAR
    in a,(VDP_CTRL_PORT)
    ld (NMI_FLAG),a
    ld (VDP_STATUS),a
AMY_RELEASE_VDP_GUARD_CLEAR:
    xor a
    ld ($701F),a
    ret
