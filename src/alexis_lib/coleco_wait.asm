; -----------------------------------------------------------------------------
; ALEXIS safe frame wait.
; Inspired by cvdevkit_sdcc/lib4ksa/delay.s.
; -----------------------------------------------------------------------------

; Wait HL video frames.
; If VDP R1 NMI enable is set, wait on NMI_FLAG so normal NMI work runs. Fall
; back to VDP polling if no NMI arrives within a bounded interval; if NMI is
; disabled from the start, poll directly.
; Input:  HL = frame count
; Clobbers: AF, BC, DE
AMY_WAIT_FRAMES_SAFE:
    ld a,h
    or l
    ret z
    ld d,h
    ld e,l
    ld a,($73C4)
    and $20
    jr z,AMY_WAIT_FRAMES_SAFE_NMI_OFF

AMY_WAIT_FRAMES_SAFE_NMI_ON:
    xor a
    ld (NMI_FLAG),a
    ld bc,$1000
AMY_WAIT_FRAMES_SAFE_NMI_ON_LOOP:
    ld a,(NMI_FLAG)
    or a
    jr nz,AMY_WAIT_FRAMES_SAFE_NMI_ON_DONE
    dec bc
    ld a,b
    or c
    jr nz,AMY_WAIT_FRAMES_SAFE_NMI_ON_LOOP
    jr AMY_WAIT_FRAMES_SAFE_NMI_OFF
AMY_WAIT_FRAMES_SAFE_NMI_ON_DONE:
    dec de
    ld a,d
    or e
    jr nz,AMY_WAIT_FRAMES_SAFE_NMI_ON
    ret

AMY_WAIT_FRAMES_SAFE_NMI_OFF:
    call READ_REGISTER
AMY_WAIT_FRAMES_SAFE_NMI_OFF_CHECK:
    ld a,d
    or e
    ret z
AMY_WAIT_FRAMES_SAFE_VDP_LOOP:
    call READ_REGISTER
    rlca
    jr nc,AMY_WAIT_FRAMES_SAFE_VDP_LOOP
    dec de
    jr AMY_WAIT_FRAMES_SAFE_NMI_OFF_CHECK
