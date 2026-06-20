; -----------------------------------------------------------------------------
; ALEXIS spinner enable/disable/reset helpers
; SPINNER_ENABLED, SPINNER_1, SPINNER_2 emitted by project.js when spinners are used.
; -----------------------------------------------------------------------------

; Enable lib4ksa-compatible spinner interrupts.
AMY_ENABLE_SPINNER:
    push af
    ei
    or $FF
    ld hl,SPINNER_ENABLED
    ld (hl),a
    pop af
    ret

; Disable lib4ksa-compatible spinner interrupts.
AMY_DISABLE_SPINNER:
    push af
    di
    xor a
    ld hl,SPINNER_ENABLED
    ld (hl),a
    pop af
    ret

AMY_RESET_SPINNER1:
    push af
    xor a
    ld hl,SPINNER_1
    ld (hl),a
    pop af
    ret

AMY_RESET_SPINNER2:
    push af
    xor a
    ld hl,SPINNER_2
    ld (hl),a
    pop af
    ret

AMY_RESET_SPINNERS:
    push af
    xor a
    ld hl,SPINNER_1
    ld (hl),a
    ld hl,SPINNER_2
    ld (hl),a
    pop af
    ret
