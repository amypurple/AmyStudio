; -----------------------------------------------------------------------------
; ALEXIS sprite collision helpers
; -----------------------------------------------------------------------------

AMY_SPRITE_TABLE EQU $7092

; Internal ALEXIS copy of lib4ksa _check_collision.
; Stack arguments after CALL:
;   sprite1 ptr, sprite2 ptr,
;   sprite1 hor size word, sprite1 vert size word,
;   sprite2 hor size word, sprite2 vert size word
; Returns HL=0 or HL=1.
AMY_CHECK_COLLISION_RAW:
    push ix
    ld ix,$0004
    add ix,sp
    ld l,(ix+0)
    ld h,(ix+1)
    ld a,(hl)
    add a,$20
    add a,(ix+6)
    ld e,a
    ld d,$00
    ld l,(ix+2)
    ld h,(ix+3)
    ld a,(hl)
    add a,$20
    add a,(ix+10)
    ld l,a
    ld h,$00
    ld b,(ix+11)
    ex de,hl
    or a
    sbc hl,de
    jr nc,AMY_CHECK_COLLISION_RAW_V_OK
    ld b,(ix+7)
    add hl,de
    ex de,hl
    or a
    sbc hl,de
AMY_CHECK_COLLISION_RAW_V_OK:
    ld a,l
    cp b
    jr nc,AMY_CHECK_COLLISION_RAW_DONE
    ld l,(ix+0)
    ld h,(ix+1)
    inc hl
    ld e,(hl)
    inc hl
    inc hl
    ld a,(hl)
    and $80
    rrca
    rrca
    xor $20
    add a,(ix+4)
    add a,e
    ld e,a
    ld a,$00
    adc a,a
    ld d,a
    ld l,(ix+2)
    ld h,(ix+3)
    inc hl
    ld c,(hl)
    inc hl
    inc hl
    ld a,(hl)
    and $80
    rrca
    rrca
    xor $20
    add a,(ix+8)
    add a,c
    ld l,a
    ld a,$00
    adc a,a
    ld h,a
    ld b,(ix+9)
    ex de,hl
    or a
    sbc hl,de
    jr nc,AMY_CHECK_COLLISION_RAW_H_OK
    ld b,(ix+5)
    add hl,de
    ex de,hl
    or a
    sbc hl,de
AMY_CHECK_COLLISION_RAW_H_OK:
    ld a,h
    or a
    jr nz,AMY_CHECK_COLLISION_RAW_DONE
    ld a,l
    cp b
AMY_CHECK_COLLISION_RAW_DONE:
    ld hl,$0000
    adc hl,hl
    pop ix
    ret

; Input: A=sprite1 index, B=sprite2 index, C=box width, D=box height
; Returns: A=1 if the two ALEXIS shadow sprites overlap, else A=0
AMY_CHECK_SPRITE_COLLISION_BOX:
    push ix
    push iy
    push de                  ; preserve D=height before ld de clobbers it
    add a,a
    add a,a
    ld l,a
    ld h,0
    ld de,AMY_SPRITE_TABLE
    add hl,de
    push hl
    pop ix
    ld a,b
    add a,a
    add a,a
    ld l,a
    ld h,0
    add hl,de                ; DE still = AMY_SPRITE_TABLE
    push hl
    pop iy
    pop de                   ; restore D=height, C=width still intact
    ld l,0
    ld h,d
    push hl
    ld l,0
    ld h,c
    push hl
    ld l,0
    ld h,d
    push hl
    ld l,0
    ld h,c
    push hl
    push iy
    push ix
    call AMY_CHECK_COLLISION_RAW
    pop bc
    pop bc
    pop bc
    pop bc
    pop bc
    pop bc
    ld a,l
    pop iy
    pop ix
    ret

; Input: A=sprite1 index, B=sprite2 index, C=x offset, D=y offset, E=box width, L=box height
; Applies the same local rectangle to both sprites and returns A=1 on overlap, else A=0
AMY_CHECK_SPRITE_COLLISION_RECT:
    push ix
    push iy
    push bc
    push de
    push hl
    add a,a
    add a,a
    ld l,a
    ld h,0
    ld de,AMY_SPRITE_TABLE
    add hl,de
    push hl
    pop ix
    ld a,b
    add a,a
    add a,a
    ld l,a
    ld h,0
    ld de,AMY_SPRITE_TABLE
    add hl,de
    push hl
    pop iy
    pop hl
    pop de
    pop bc
    ld a,l
    ld l,d
    ld h,a
    push hl
    ld l,c
    ld h,e
    push hl
    ld l,d
    ld h,a
    push hl
    ld l,c
    ld h,e
    push hl
    push iy
    push ix
    call AMY_CHECK_COLLISION_RAW
    pop bc
    pop bc
    pop bc
    pop bc
    pop bc
    pop bc
    ld a,l
    pop iy
    pop ix
    ret
