; -----------------------------------------------------------------------------
; ALEXIS tiny sound helpers
; Adapted from NewColeco's sndtiny.asm so lib4ksa-style sound tables can target
; compact SPECIAL-04 music streams through sndtiny_1 / sndtiny_2.
; -----------------------------------------------------------------------------

sndtiny_1:
    ld de,AMY_TINYSOUND_SLOT_1
    jp AMY_TINY_SOUND_INIT
; SPECIAL-04 uses a second entry path starting at the aligned bytes below.
; Keep the label before the NOP so optimizers treat the padding and following
; LD DE / JP PLAY sequence as a live entry block, not removable dead code.
AMY_TINY_SOUND_SLOT_1_PLAY_ENTRY:
    nop
    ld de,AMY_TINYSOUND_SLOT_1
    jp AMY_TINY_SOUND_PLAY

sndtiny_2:
    ld de,AMY_TINYSOUND_SLOT_2
    jp AMY_TINY_SOUND_INIT
; Same alignment-sensitive secondary entry for slot 2.
AMY_TINY_SOUND_SLOT_2_PLAY_ENTRY:
    nop
    ld de,AMY_TINYSOUND_SLOT_2

AMY_TINY_SOUND_PLAY:
    push de
    pop iy
    ld a,(iy+5)
    or a
    jr z,AMY_TINY_SOUND_NEXT
AMY_TINY_SOUND_TICK:
    dec a
    ld (iy+5),a
    call $012F
    ld a,(ix+7)
    or a
    jp z,AMY_TINY_SOUND_FREQ_CHANGE
    jp $00FC
AMY_TINY_SOUND_NEXT:
    ld a,(iy+4)
    dec a
    ld (iy+5),a
AMY_TINY_SOUND_NEXT_CODE:
    call AMY_TINY_SOUND_READ_NEXT
    or a
    ret z
    cp $FE
    jr c,AMY_TINY_SOUND_SET_SILENCE
    jr z,AMY_TINY_SOUND_SPECIAL_DRUM
    ld l,(iy+0)
    ld h,(iy+1)
    ld (iy+2),l
    ld (iy+3),h
    jr AMY_TINY_SOUND_NEXT_CODE
AMY_TINY_SOUND_SPECIAL_DRUM:
    push ix
    pop de
    inc de
    inc de
    inc de
    ld hl,AMY_TINY_SOUND_SPECIAL_DRUM_DATA
    ld bc,$0007
    ldir
    ret
AMY_TINY_SOUND_SET_SILENCE:
    dec a
    jr nz,AMY_TINY_SOUND_SET_INSTRUMENT
    ld a,(ix+4)
    or $F0
    ld (ix+4),a
    xor a
    ld (ix+7),a
    ld (ix+8),a
    ret
AMY_TINY_SOUND_SET_INSTRUMENT:
    dec a
    jr nz,AMY_TINY_SOUND_SPECIAL_NOTE
    call AMY_TINY_SOUND_READ_NEXT
    ld (iy+13),a
    call AMY_TINY_SOUND_READ_NEXT
    ld (iy+14),a
    call AMY_TINY_SOUND_READ_NEXT
    ld (iy+15),a
    jr AMY_TINY_SOUND_NEXT_CODE
AMY_TINY_SOUND_SPECIAL_NOTE:
    dec a
    jr nz,AMY_TINY_SOUND_NEW_NOTE
    call AMY_TINY_SOUND_READ_NEXT
    ld (ix+3),a
    call AMY_TINY_SOUND_READ_NEXT
    ld (ix+4),a
    call AMY_TINY_SOUND_READ_NEXT
    ld (ix+5),a
    call AMY_TINY_SOUND_READ_NEXT
    ld (ix+6),a
    call AMY_TINY_SOUND_READ_NEXT
    ld (ix+7),a
    call AMY_TINY_SOUND_READ_NEXT
    ld (ix+8),a
    call AMY_TINY_SOUND_READ_NEXT
    ld (ix+9),a
    ret
AMY_TINY_SOUND_NEW_NOTE:
    push bc
    dec a
    ld b,a
    rlca
    and $01
    ld c,a
    ld a,b
    and $3F
    add a,a
    inc a
    sub c
    ld (iy+7),a
    add a,c
    ld (iy+8),a
    add a,c
    ld (iy+9),a
    sub c
    bit 6,b
    jr z,AMY_TINY_SOUND_NEW_NOTE_NO_ARPEGGIO
    call AMY_TINY_SOUND_READ_NEXT
    sub $04
    and $3F
    add a,a
    inc a
AMY_TINY_SOUND_NEW_NOTE_NO_ARPEGGIO:
    sub c
    ld (iy+10),a
    add a,c
    ld (iy+11),a
    add a,c
    ld (iy+12),a
    xor a
    ld (ix+7),a
    ld b,(iy+13)
    ld a,(ix+4)
    and $0F
    or b
    pop bc
    ld (ix+4),a
    ld a,(iy+14)
    ld (ix+8),a
    ld a,(iy+15)
    ld (ix+9),a
AMY_TINY_SOUND_FREQ_CHANGE:
    ld a,(AMY_FRAME_COUNTER)
    and $07
    push de
    ld e,a
    ld d,$00
    push hl
    ld hl,AMY_TINY_SOUND_DATA6TO8
    add hl,de
    ld e,(hl)
    push iy
    pop hl
    add hl,de
    ld a,(hl)
    add a,a
    ld e,a
    ld hl,AMY_TINY_SOUND_DATA_NOTES
    add hl,de
    ld a,(hl)
    ld (ix+3),a
    inc hl
    ld a,(hl)
    ld e,a
    ld a,(ix+4)
    and $F0
    or e
    ld (ix+4),a
    pop hl
    pop de
    ret

AMY_TINY_SOUND_INIT:
    ld a,(hl)
    inc hl
    ex de,hl
    ld (hl),e
    inc hl
    ld (hl),d
    inc hl
    ld (hl),e
    inc hl
    ld (hl),d
    inc hl
    ld (hl),a
    inc hl
    xor a
    ld (hl),a
    ex de,hl
    ret

AMY_TINY_SOUND_READ_NEXT:
    ld l,(iy+2)
    ld h,(iy+3)
    ld a,(hl)
    inc hl
    ld (iy+2),l
    ld (iy+3),h
    ret

AMY_TINY_SOUND_SPECIAL_DRUM_DATA:
    db $5f,$11,$0c,$11,$30,$1d,$22

AMY_TINY_SOUND_DATA6TO8:
    db 8,11,9,12,8,11,7,10

AMY_TINY_SOUND_DATA_NOTES:
    dw $03ff,$03f8,$03db,$03bf,$03a4,$0389,$036f,$0356
    dw $033e,$0327,$0310,$02f9,$02e3,$02ce,$02ba,$02a6
    dw $0293,$0280,$026e,$025c,$024b,$023a,$022a,$021a
    dw $020b,$01fc,$01ed,$01df,$01d1,$01c4,$01b7,$01ab
    dw $019f,$0193,$0187,$017c,$0171,$0167,$015d,$0153
    dw $0149,$0140,$0137,$012e,$0125,$011d,$0115,$010d
    dw $0105,$00fe,$00f6,$00ef,$00e8,$00e2,$00db,$00d5
    dw $00cf,$00c9,$00c3,$00be,$00b8,$00b3,$00ae,$00a9
    dw $00a4,$00a0,$009b,$0097,$0092,$008e,$008a,$0086
    dw $0082,$007f,$007b,$0077,$0074,$0071,$006d,$006a
    dw $0067,$0064,$0061,$005f,$005c,$0059,$0056,$0054
    dw $0052,$0050,$004d,$004b,$0049,$0047,$0045,$0043
    dw $0041,$003f,$003d,$003b,$0039,$0038,$0036,$0035
    dw $0033,$0032,$0030,$002f,$002d,$002c,$002b,$002a
