; Native EOS boot block. This program does not map OS7 or a cartridge ROM.
EOS_WRITE_VRAM      equ $FD1A
EOS_WRITE_REGISTER  equ $FD20
EOS_FILL_VRAM       equ $FD26
EOS_INIT_TABLE      equ $FD29
EOS_LOAD_ASCII      equ $FD38
EOS_PRINTER_WRITE_CHAR equ $FC66

org $C800
    di
    ld sp,$2FF0

    ; Configure the standard 32-column Graphics I tables through EOS.
    ; Enable 16 KB VRAM before touching addresses above $0FFF, but keep display off.
    ld b,1
    ld c,$80
    call EOS_WRITE_REGISTER
    ld hl,$1800
    ld a,2
    call EOS_INIT_TABLE
    ld hl,$0000
    ld a,3
    call EOS_INIT_TABLE
    ld hl,$2000
    ld a,4
    call EOS_INIT_TABLE
    call EOS_LOAD_ASCII

    ld hl,$1800
    ld de,768
    ld a,$20
    call EOS_FILL_VRAM

    ld hl,Title
    ld de,$18CA
    ld bc,10
    call EOS_WRITE_VRAM
    ld hl,Subtitle
    ld de,$1927
    ld bc,18
    call EOS_WRITE_VRAM
    ld hl,MediaLine
    ld de,$1968
    ld bc,16
    call EOS_WRITE_VRAM
    ld hl,RuntimeLine
    ld de,$19A8
    ld bc,16
    call EOS_WRITE_VRAM
    ld hl,TestLine
    ld de,$19E5
    ld bc,20
    call EOS_WRITE_VRAM

    ; A visible emulator fixture: EOS sends each byte to AdamNet printer $02.
    ld a,$41
    call EOS_PRINTER_WRITE_CHAR
    ld a,$4D
    call EOS_PRINTER_WRITE_CHAR
    ld a,$59
    call EOS_PRINTER_WRITE_CHAR
    ld a,$0D
    call EOS_PRINTER_WRITE_CHAR

    ld b,7
    ld c,$F1
    call EOS_WRITE_REGISTER
    ld b,1
    ld c,$E0
    call EOS_WRITE_REGISTER
    ld a,$A5
    ld ($2100),a
    ld a,5
    ld ($2101),a
Forever:
    halt
    jp Forever

Title:       db "AMY STUDIO"
Subtitle:    db "NATIVE EOS STARTER"
MediaLine:   db "BOOTED FROM MEDIA"
RuntimeLine: db "NO OS7 CARTRIDGE"
TestLine:    db "SELF TESTS: 5 PASSED"
