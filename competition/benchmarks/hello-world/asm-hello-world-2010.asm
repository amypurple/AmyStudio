; COLECOVISION - HELLO WORLD!
; By Amy Bienvenu, published as Daniel Bienvenu in 2010
; Original AtariAge sample for TNIASM, assembled here by Amy's Z80 assembler.

CALC_OFFSET     equ $08c0
LOAD_ASCII      equ $1f7f
FILL_VRAM       equ $1f82
MODE_1          equ $1f85
PUT_VRAM        equ $1fbe
TURN_OFF_SOUND  equ $1fd6
WRITE_REGISTER  equ $1fd9
READ_REGISTER   equ $1fdc
WRITE_VRAM      equ $1fdf

VRAM_NAME       equ $1800
VRAM_COLOR      equ $2000

cpu Z80
org $8000
db $aa,$55
dw 0,0,0,0
dw Start

rst_8:  reti
        nop
rst_10: reti
        nop
rst_18: reti
        nop
rst_20: reti
        nop
rst_28: reti
        nop
rst_30: reti
        nop
rst_38: reti
        nop

jp Nmi
db "HELLO WORLD!/PRINT ON SCREEN/2010"

Start:
    im 1
    ld hl,$0000
    ld de,$4000
    xor a
    call FILL_VRAM
    call MODE_1
    call TURN_OFF_SOUND
    call LOAD_ASCII

    ld hl,VRAM_COLOR
    ld de,32
    ld a,$f0
    call FILL_VRAM

    call Static_Offset
    call Write_HelloWorld

    ld bc,$01c2
    call WRITE_REGISTER

TheEnd:
    jp TheEnd

HelloWorld:
    db "HELLO WORLD!"

Static_Offset:
    ld de,VRAM_NAME+10
    ret

; Alternative shown in the original tutorial: compute row 0, column 10.
Calculated_Offset:
    ld d,0
    ld e,10
    call CALC_OFFSET
    ld hl,VRAM_NAME
    add hl,de
    ex de,hl
    ret

Write_HelloWorld:
    ld hl,HelloWorld
    ld bc,12
    jp WRITE_VRAM

; Alternative BIOS routine shown in the original tutorial.
Put_HelloWorld:
    ld a,2
    ld hl,HelloWorld
    ld iy,12
    jp PUT_VRAM

Nmi:
    ld hl,VRAM_COLOR
    ld de,32
    ld a,r
    and $f0
    call FILL_VRAM
    call READ_REGISTER
    retn
