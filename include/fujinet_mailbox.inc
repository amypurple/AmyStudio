; FujiNet ColecoVision mailbox primitives for Amy Studio.
; Never read $F800 or above from an NMI handler.
FN_REPLY equ $F800
FN_ACKSEQ equ $FC00
FN_STATUS equ $FC01
FN_ERR equ $FC02
FN_REPLYCMD equ $FC03
FN_RXLEN_LO equ $FC04
FN_RXLEN_HI equ $FC05
FN_MAGIC0 equ $FC09
FN_MAGIC1 equ $FC0A
FN_PROTOVER equ $FC0B
FNR_DEVICE equ $00
FNR_COMMAND equ $01
FNR_NPARAM equ $02
FNR_DATA_RESET equ $05
FNR_SEQ equ $10

FN_PRESENT:
    ld a,(FN_MAGIC0)
    cp "F"
    ret nz
    ld a,(FN_MAGIC1)
    cp "N"
    ret

FN_REG_WRITE:
    push af
    ld h,$FD
    ld l,c
    ld a,(hl)
    pop af
    ld h,$FE
    ld l,a
    ld a,(hl)
    ret

FN_TX_BYTE:
    ld h,$FF
    ld l,a
    ld a,(hl)
    ret

; A = one-byte parameter value. FujiBus parameters are size-prefixed.
FN_PARAM8:
    ld b,a
    ld a,1
    call FN_TX_BYTE
    ld a,b
    jp FN_TX_BYTE

; HL = one-word parameter value, little endian.
FN_PARAM16:
    push hl
    ld a,2
    call FN_TX_BYTE
    pop hl
    ld a,l
    call FN_TX_BYTE
    ld a,h
    jp FN_TX_BYTE

FN_BEGIN:
    xor a
    ld c,FNR_DATA_RESET
    call FN_REG_WRITE
    ld a,d
    ld c,FNR_DEVICE
    call FN_REG_WRITE
    ld a,e
    ld c,FNR_COMMAND
    call FN_REG_WRITE
    ld a,b
    ld c,FNR_NPARAM
    jp FN_REG_WRITE

FN_COMMIT_BEGIN:
    ld a,(FN_ACKSEQ)
    inc a
    jr nz,FN_COMMIT_NONZERO
    inc a
FN_COMMIT_NONZERO:
    ld (hl),a
    ld c,FNR_SEQ
    jp FN_REG_WRITE

FN_POLL:
    ld a,(FN_ACKSEQ)
    cp (hl)
    jr z,FN_POLL_READY
    xor a
    ret
FN_POLL_READY:
    ld a,(FN_ERR)
    or a
    jr nz,FN_POLL_ERROR
    ld a,(FN_REPLYCMD)
    cp $06
    jr nz,FN_POLL_NAK
    ld a,1
    ret
FN_POLL_NAK:
    ld a,1
FN_POLL_ERROR:
    or $80
    ret

FN_REPLY_LENGTH:
    ld hl,(FN_RXLEN_LO)
    ret
