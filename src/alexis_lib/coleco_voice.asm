; Amy external SP0256 voice-module support.
; Module values: B=0 none, B=1 Lundy ($43-$45), B=2 EVE SS-CC ($48-$4B).

; Detect Lundy first, then EVE. Returns the module value in A.
AMY_VOICE_DETECT:
    xor a
    out ($45),a
    ld de,$1000
AMY_VOICE_DETECT_RESET_DELAY:
    dec de
    ld a,d
    or e
    jr nz,AMY_VOICE_DETECT_RESET_DELAY
    in a,($44)
    and $01
    ld c,a
    ld a,$04
    out ($43),a
    ld d,$00
AMY_VOICE_DETECT_LUNDY:
    in a,($44)
    and $01
    xor c
    jr nz,AMY_VOICE_DETECT_LUNDY_FOUND
    dec d
    jr nz,AMY_VOICE_DETECT_LUNDY
    ld a,$81
    out ($4B),a
    xor a
    out ($48),a
    ld a,$8F
    out ($49),a
    ld d,$00
AMY_VOICE_DETECT_EVE_INIT_DELAY:
    dec d
    jr nz,AMY_VOICE_DETECT_EVE_INIT_DELAY
    ld a,$0F
    out ($49),a
    ld a,$04
    out ($48),a
    or $80
    out ($49),a
    xor a
    out ($49),a
    ld d,$00
AMY_VOICE_DETECT_EVE:
    in a,($4A)
    and $01
    jr z,AMY_VOICE_DETECT_EVE_FOUND
    dec d
    jr nz,AMY_VOICE_DETECT_EVE
    xor a
    ret
AMY_VOICE_DETECT_LUNDY_FOUND:
    ld a,$01
    ret
AMY_VOICE_DETECT_EVE_FOUND:
    ld a,$02
    ret

; Return A=1 when the selected adapter can accept an allophone, otherwise A=0.
AMY_VOICE_READY:
    ld a,b
    cp $01
    jr z,AMY_VOICE_READY_LUNDY
    cp $02
    jr z,AMY_VOICE_READY_EVE
    xor a
    ret
AMY_VOICE_READY_LUNDY:
    in a,($44)
    and $01
    xor $01
    ret
AMY_VOICE_READY_EVE:
    in a,($4A)
    and $01
    ret

; Reset the selected adapter.
AMY_VOICE_RESET:
    ld a,b
    cp $01
    jr z,AMY_VOICE_RESET_LUNDY
    cp $02
    ret nz
    ld a,$81
    out ($4B),a
    xor a
    out ($48),a
    ld a,$8F
    out ($49),a
    ld d,$00
AMY_VOICE_RESET_EVE_DELAY:
    dec d
    jr nz,AMY_VOICE_RESET_EVE_DELAY
    ld a,$0F
    out ($49),a
    ret
AMY_VOICE_RESET_LUNDY:
    xor a
    out ($45),a
    ret

; Wait until ready and send C. Returns immediately for module 0/unknown.
AMY_VOICE_ALLOPHONE:
    ld a,b
    cp $01
    jr z,AMY_VOICE_ALLOPHONE_WAIT
    cp $02
    ret nz
AMY_VOICE_ALLOPHONE_WAIT:
    push bc
    call AMY_VOICE_READY
    pop bc
    or a
    jr z,AMY_VOICE_ALLOPHONE_WAIT
    ld a,b
    cp $01
    jr z,AMY_VOICE_ALLOPHONE_LUNDY
    cp $02
    ret nz
    ld a,c
    out ($48),a
    or $80
    out ($49),a
    xor a
    out ($49),a
    ret
AMY_VOICE_ALLOPHONE_LUNDY:
    ld a,c
    out ($43),a
    ret

; Speak an $FF-terminated allophone sequence at HL. This call is blocking.
AMY_VOICE_SPEAK:
    ld a,b
    or a
    ret z
AMY_VOICE_SPEAK_NEXT:
    ld a,(hl)
    cp $FF
    ret z
    inc hl
    ld c,a
    push hl
    push bc
    call AMY_VOICE_ALLOPHONE
    pop bc
    pop hl
    jr AMY_VOICE_SPEAK_NEXT

; Begin asynchronous playback. B=module, HL=$FF-terminated phrase.
; Publish the pointer last so NMI never observes a partially installed queue.
AMY_VOICE_START:
    xor a
    ld (AMY_VOICE_POINTER),a
    ld (AMY_VOICE_POINTER+1),a
    ld a,b
    ld (AMY_VOICE_MODULE),a
    or a
    ret z
    ld (AMY_VOICE_POINTER),hl
    ret

; Feed at most one allophone. Safe to call once per VBlank.
AMY_VOICE_UPDATE:
    ld hl,(AMY_VOICE_POINTER)
    ld a,h
    or l
    ret z
    ld a,(AMY_VOICE_MODULE)
    ld b,a
    push hl
    call AMY_VOICE_READY
    pop hl
    or a
    ret z
    ld a,(hl)
    cp $FF
    jr z,AMY_VOICE_STOP
    inc hl
    ld (AMY_VOICE_POINTER),hl
    ld c,a
    ld a,b
    cp $01
    jr z,AMY_VOICE_UPDATE_LUNDY
    cp $02
    jr nz,AMY_VOICE_STOP
    ld a,c
    out ($48),a
    or $80
    out ($49),a
    xor a
    out ($49),a
    ret
AMY_VOICE_UPDATE_LUNDY:
    ld a,c
    out ($43),a
    ret

AMY_VOICE_STOP:
    xor a
    ld (AMY_VOICE_POINTER),a
    ld (AMY_VOICE_POINTER+1),a
    ret

; Return A=1 while a phrase remains queued, otherwise A=0.
AMY_VOICE_SPEAKING:
    ld hl,(AMY_VOICE_POINTER)
    ld a,h
    or l
    ret z
    ld a,1
    ret
