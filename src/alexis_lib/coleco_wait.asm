; -----------------------------------------------------------------------------
; ALEXIS safe frame wait.
; Inspired by cvdevkit_sdcc/lib4ksa/delay.s.
; -----------------------------------------------------------------------------

; Wait HL video frames.
; If VDP R1 NMI enable is set, wait on NMI_FLAG so normal NMI work runs.
; If NMI is disabled, poll VDP status directly so the wait cannot hang on HALT.
; Input:  HL = frame count
; Clobbers: AF, DE
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
AMY_WAIT_FRAMES_SAFE_NMI_ON_LOOP:
    ld a,(NMI_FLAG)
    or a
    jr z,AMY_WAIT_FRAMES_SAFE_NMI_ON_LOOP
    dec de
    ld a,d
    or e
    jr nz,AMY_WAIT_FRAMES_SAFE_NMI_ON
    ret

AMY_WAIT_FRAMES_SAFE_NMI_OFF:
    call READ_REGISTER
AMY_WAIT_FRAMES_SAFE_VDP_LOOP:
    call READ_REGISTER
    rlca
    jr nc,AMY_WAIT_FRAMES_SAFE_VDP_LOOP
    dec de
    ld a,d
    or e
    jr nz,AMY_WAIT_FRAMES_SAFE_NMI_OFF
    ret
