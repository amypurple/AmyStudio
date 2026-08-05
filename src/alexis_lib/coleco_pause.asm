; -----------------------------------------------------------------------------
; Amy CRT-safe press-and-release pause
; -----------------------------------------------------------------------------

; Wait for every selected action button to be released, then for a fresh press,
; then consume its release. If the timeout expires, clear only VDP R1 display
; bit 6 while leaving NMI bit 5 and sprite configuration untouched.
;
; Inputs:
;   HL = NTSC timeout in VBlank ticks
;   DE = PAL timeout in VBlank ticks
;   A  = controller selector: 0=both, 1=joypad 1, 2=joypad 2
;
; Requires VDP NMI enabled. The compiler rejects calls where R1 tracking proves
; that NMI is disabled. NMI_FLAG ensures spinner IRQs cannot count as VBlanks.
AMY_PAUSE_PRESS_RELEASE_BLANK:
    ld b,a
    ld a,($0069)             ; Official BIOS AMERICA byte: 50 PAL, 60 NTSC.
    cp 50
    jr nz,AMY_PAUSE_REGION_SELECTED
    ex de,hl
AMY_PAUSE_REGION_SELECTED:
    ld e,b                   ; Controller selector remains live across phases.
    ld a,($73C4)
    and $40
    ld d,a                   ; Save only the original display-enable bit.
    ld b,0                   ; B=1 after the timeout has blanked the display.

AMY_PAUSE_INITIAL_RELEASE:
    call AMY_PAUSE_VBLANK_TICK
    call AMY_PAUSE_READ_ACTIONS
    or a
    jr nz,AMY_PAUSE_INITIAL_RELEASE

AMY_PAUSE_FRESH_PRESS:
    call AMY_PAUSE_VBLANK_TICK
    call AMY_PAUSE_READ_ACTIONS
    or a
    jr z,AMY_PAUSE_FRESH_PRESS

AMY_PAUSE_FINAL_RELEASE:
    call AMY_PAUSE_VBLANK_TICK
    call AMY_PAUSE_READ_ACTIONS
    or a
    jr nz,AMY_PAUSE_FINAL_RELEASE

    ld a,b
    or a
    ret z
    ld a,($73C4)
    and $BF
    or d                     ; Restore only the entry display bit.
    ld ($73C4),a
    ld c,a
    ld b,1
    jp WRITE_REGISTER

; Wait for one real VBlank NMI, decrement the timeout, and blank exactly once.
AMY_PAUSE_VBLANK_TICK:
    xor a
    ld (NMI_FLAG),a
AMY_PAUSE_VBLANK_WAIT:
    halt
    ld a,(NMI_FLAG)
    or a
    jr z,AMY_PAUSE_VBLANK_WAIT
    ld a,h
    or l
    ret z
    dec hl
    ld a,h
    or l
    ret nz
    ld a,b
    or a
    ret nz
    push hl
    push de
    ld a,($73C4)
    and $BF                  ; Display off, NMI remains unchanged.
    ld ($73C4),a
    ld c,a
    ld b,1
    call WRITE_REGISTER
    pop de
    pop hl
    ld b,1
    ret

; Return the selected controllers' complete action nibble in A.
AMY_PAUSE_READ_ACTIONS:
    ld a,e
    or a
    jr z,AMY_PAUSE_READ_BOTH
    dec a
    jr z,AMY_PAUSE_READ_ONE
    ld a,(JOYPAD_2)
    and $F0
    ret
AMY_PAUSE_READ_ONE:
    ld a,(JOYPAD_1)
    and $F0
    ret
AMY_PAUSE_READ_BOTH:
    ld a,(JOYPAD_1)
    and $F0
    ld c,a
    ld a,(JOYPAD_2)
    and $F0
    or c
    ret
; Wait for a fresh keypad value in B..C, consume its release, and preserve the
; same region-aware CRT blanking contract as pause until press.
; Inputs: B=min, C=max, HL=NTSC ticks, DE=PAL ticks, A=0 both/1 pad1/2 pad2.
; Output: A=decoded keypad value ($0A=*, $0B=#).
AMY_CHOICE_KEYPAD_RANGE_BLANK:
    push af
    ld a,($0069)
    cp 50
    jr nz,AMY_CHOICE_KEYPAD_REGION_SELECTED
    ex de,hl
AMY_CHOICE_KEYPAD_REGION_SELECTED:
    pop af
    ld e,a
    ld a,($73C4)
    and $40
    ld d,a

AMY_CHOICE_KEYPAD_INITIAL_RELEASE:
    call AMY_CHOICE_KEYPAD_VBLANK_TICK
    call AMY_CHOICE_KEYPAD_READ
    cp $FF
    jr nz,AMY_CHOICE_KEYPAD_INITIAL_RELEASE

AMY_CHOICE_KEYPAD_FRESH_PRESS:
    call AMY_CHOICE_KEYPAD_VBLANK_TICK
    call AMY_CHOICE_KEYPAD_READ
    cp $FF
    jr z,AMY_CHOICE_KEYPAD_FRESH_PRESS
    cp b
    jr c,AMY_CHOICE_KEYPAD_FRESH_PRESS
    cp c
    jr z,AMY_CHOICE_KEYPAD_TAKE
    jr nc,AMY_CHOICE_KEYPAD_FRESH_PRESS
AMY_CHOICE_KEYPAD_TAKE:
    push af

AMY_CHOICE_KEYPAD_FINAL_RELEASE:
    call AMY_CHOICE_KEYPAD_VBLANK_TICK
    call AMY_CHOICE_KEYPAD_READ
    cp $FF
    jr nz,AMY_CHOICE_KEYPAD_FINAL_RELEASE

    ld a,h
    or l
    jr nz,AMY_CHOICE_KEYPAD_RETURN
    ld a,($73C4)
    and $BF
    or d
    ld ($73C4),a
    ld c,a
    ld b,1
    call WRITE_REGISTER
AMY_CHOICE_KEYPAD_RETURN:
    pop af
    ret

AMY_CHOICE_KEYPAD_VBLANK_TICK:
    xor a
    ld (NMI_FLAG),a
AMY_CHOICE_KEYPAD_VBLANK_WAIT:
    halt
    ld a,(NMI_FLAG)
    or a
    jr z,AMY_CHOICE_KEYPAD_VBLANK_WAIT
    ld a,h
    or l
    ret z
    dec hl
    ld a,h
    or l
    ret nz
    push bc
    push de
    push hl
    ld a,($73C4)
    and $BF
    ld ($73C4),a
    ld c,a
    ld b,1
    call WRITE_REGISTER
    pop hl
    pop de
    pop bc
    ret

; Return the first selected keypad value, or $FF when all selected pads are idle.
AMY_CHOICE_KEYPAD_READ:
    ld a,e
    or a
    jr z,AMY_CHOICE_KEYPAD_READ_BOTH
    dec a
    jr z,AMY_CHOICE_KEYPAD_READ_ONE
    ld a,(KEYPAD_2)
    ret
AMY_CHOICE_KEYPAD_READ_ONE:
    ld a,(KEYPAD_1)
    ret
AMY_CHOICE_KEYPAD_READ_BOTH:
    ld a,(KEYPAD_1)
    cp $FF
    ret nz
    ld a,(KEYPAD_2)
    ret