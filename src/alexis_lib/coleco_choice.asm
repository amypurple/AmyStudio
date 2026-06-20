; -----------------------------------------------------------------------------
; ALEXIS keypad range-choice helper
; Uses KEYPAD_1 / KEYPAD_2 emitted by project.js when controllers are enabled.
; -----------------------------------------------------------------------------

; Wait for a keypad choice in range [B..C] on either pad, then wait for release. Returns A=key.
AMY_CHOICE_KEYPAD_RANGE:
AMY_CHOICE_KEYPAD_RANGE_WAIT:
    halt
    ld a,(KEYPAD_1)
    cp b
    jr c,AMY_CHOICE_KEYPAD_RANGE_PAD2
    cp c
    jr z,AMY_CHOICE_KEYPAD_RANGE_TAKE1
    jr c,AMY_CHOICE_KEYPAD_RANGE_TAKE1
AMY_CHOICE_KEYPAD_RANGE_PAD2:
    ld a,(KEYPAD_2)
    cp b
    jr c,AMY_CHOICE_KEYPAD_RANGE_WAIT
    cp c
    jr z,AMY_CHOICE_KEYPAD_RANGE_TAKE2
    jr nc,AMY_CHOICE_KEYPAD_RANGE_WAIT
AMY_CHOICE_KEYPAD_RANGE_TAKE2:
    ld d,a
    jr AMY_CHOICE_KEYPAD_RANGE_RELEASE
AMY_CHOICE_KEYPAD_RANGE_TAKE1:
    ld d,a
AMY_CHOICE_KEYPAD_RANGE_RELEASE:
    halt
    ld a,(KEYPAD_1)
    cp $FF
    jr nz,AMY_CHOICE_KEYPAD_RANGE_RELEASE
    ld a,(KEYPAD_2)
    cp $FF
    jr nz,AMY_CHOICE_KEYPAD_RANGE_RELEASE
    ld a,d
    ret
