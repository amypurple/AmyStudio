; Fixed 16 KB area, mapped at $8000-$BFFF from the final physical ROM bank.
WRITE_VRAM      equ $1FDF
WRITE_REGISTER  equ $1FD9
FILL_VRAM       equ $1F82
INIT_TABLE      equ $1FB8
LOAD_ASCII      equ $1F7F

org $8000
    db $55,$AA
    dw 0,0,0,0
    dw Start
    jp 0
    jp 0
    jp 0
    jp 0
    jp 0
    jp 0
    jp 0
    jp Nmi

Start:
    di
    ld sp,$73B9
    ld bc,$0000
    call WRITE_REGISTER
    ld bc,$0180
    call WRITE_REGISTER
    ld bc,$0206
    call WRITE_REGISTER
    ld bc,$0380
    call WRITE_REGISTER
    ld bc,$0400
    call WRITE_REGISTER
    ld bc,$0536
    call WRITE_REGISTER
    ld bc,$0607
    call WRITE_REGISTER
    ld bc,$07F1
    call WRITE_REGISTER
    ld hl,$0000
    ld a,3
    call INIT_TABLE
    call LOAD_ASCII
    ld hl,$1800
    ld de,768
    ld a,$20
    call FILL_VRAM
    ld hl,FixedTitle
    ld de,$18C8
    ld bc,20
    call WRITE_VRAM

    ; MegaCart selection is triggered by reading $FFC0 + physical bank.
    ld a,($FFC0)
    ld hl,$C000
    ld de,$1928
    ld bc,16
    call WRITE_VRAM
    ld a,$10
    ld ($7000),a
    ld a,($FFC1)
    ld hl,$C000
    ld de,$1968
    ld bc,16
    call WRITE_VRAM
    ld a,$21
    ld ($7001),a

    ld bc,$01E0
    call WRITE_REGISTER
Forever:
    jp Forever

Nmi:
    retn

FixedTitle: db "AMY MEGACART DEMO   "

