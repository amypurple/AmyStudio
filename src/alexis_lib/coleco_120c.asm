; Temporal 120-color display effect used by the historical 120C demos.
; The two 6 KB VRAM banks are deliberately dual-purpose: each is interpreted
; as patterns on one frame and colors on the next.

AMY_120C_ON:
    xor a
    ld (AMY_120C_PHASE),a
    inc a
    ld (AMY_120C_ENABLED),a
    jp AMY_120C_UPDATE

AMY_120C_OFF:
    xor a
    ld (AMY_120C_ENABLED),a
    ld bc,$03FF              ; Graphics II color table at $2000
    call WRITE_REGISTER
    ld bc,$0403              ; Graphics II pattern table at $0000
    jp WRITE_REGISTER

; Called once per VBlank by the generated Amy NMI when the project references
; the 120-color effect. All caller-visible registers are already preserved.
AMY_120C_UPDATE:
    ld a,(AMY_120C_ENABLED)
    or a
    ret z
    ld a,(AMY_120C_PHASE)
    xor 1
    ld (AMY_120C_PHASE),a
    jr z,AMY_120C_PHASE_ZERO

    ld bc,$037F              ; colors $0000
    call WRITE_REGISTER
    ld bc,$0404              ; patterns $2000
    jp WRITE_REGISTER

AMY_120C_PHASE_ZERO:
    ld bc,$03FF              ; colors $2000
    call WRITE_REGISTER
    ld bc,$0400              ; patterns $0000
    jp WRITE_REGISTER
