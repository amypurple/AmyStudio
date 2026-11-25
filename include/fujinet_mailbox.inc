; FujiNet ColecoVision mailbox primitives for Amy Studio.
; The target packager reserves $F800-$FFFF and writes the FUJI claim.
; Never read $F800 or above from an NMI handler.

FN_REPLY       equ $F800
FN_ACKSEQ      equ $FC00
FN_STATUS      equ $FC01
FN_ERR         equ $FC02
FN_REPLYCMD    equ $FC03
FN_RXLEN_LO    equ $FC04
FN_RXLEN_HI    equ $FC05
FN_MAGIC0      equ $FC09
FN_MAGIC1      equ $FC0A
FN_PROTOVER    equ $FC0B
FN_REGSEL      equ $FD00
FN_REGDATA     equ $FE00
FN_TXPAGE      equ $FF00
FN_APPBANK_SELECT equ $FD80

FN_DEVICE_FUJI    equ $70
FN_DEVICE_NETWORK equ $71
FN_CMD_NET_OPEN   equ $4F
FN_CMD_NET_CLOSE  equ $43
FN_CMD_NET_READ   equ $52
FN_CMD_NET_STATUS equ $53
FN_CMD_APPKEY_CLOSE equ $DB
FN_CMD_APPKEY_OPEN  equ $DC
FN_CMD_APPKEY_READ  equ $DD
FN_CMD_APPKEY_WRITE equ $DE
FN_REPLY_ACK      equ $06
FN_APPKEY_CREATOR_LO equ 1
FN_APPKEY_CREATOR_HI equ 0
FN_APPKEY_APP     equ 1
FN_APPKEY_NAME    equ 0
FN_APPKEY_ROOM    equ 17

FNR_DEVICE     equ $00
FNR_COMMAND    equ $01
FNR_NPARAM     equ $02
FNR_DATA_RESET equ $05
FNR_SEQ        equ $10

; Z is set only when a FujiNet mailbox is present.
FN_PRESENT:
    ld a,(FN_MAGIC0)
    cp "F"
    ret nz
    ld a,(FN_MAGIC1)
    cp "N"
    ret

; C = register, A = value. Clobbers A, H, L.
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

; A = byte to append to the outgoing stream. Clobbers A, H, L.
FN_TX_BYTE:
    ld h,$FF
    ld l,a
    ld a,(hl)
    ret

; A = one-byte parameter value. FujiBus parameters are size-prefixed.
; Clobbers A, B, H, L.
FN_PARAM8:
    ld b,a
    ld a,1
    call FN_TX_BYTE
    ld a,b
    jp FN_TX_BYTE

; HL = one-word parameter value, little endian. Clobbers A, H, L.
FN_PARAM16:
    push hl
    ld a,2
    call FN_TX_BYTE
    pop hl
    ld a,l
    push hl
    call FN_TX_BYTE
    pop hl
    ld a,h
    jp FN_TX_BYTE

; D = device, E = command, B = parameter count. Clobbers A, C, H, L.
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

; HL points to one writable byte. Starts a transaction and stores its sequence.
; Clobbers A, C, H, L. The caller must poll FN_POLL and enforce a timeout.
FN_COMMIT_BEGIN:
    ld a,(FN_ACKSEQ)
    inc a
    jr nz,FN_COMMIT_NONZERO
    inc a
FN_COMMIT_NONZERO:
    ld (hl),a
    ld c,FNR_SEQ
    jp FN_REG_WRITE

; HL points to the sequence byte written by FN_COMMIT_BEGIN.
; Returns A=0 pending, A=1 success, or A=$80+error on ACK/transport failure.
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

; Returns reply length in HL after FN_POLL reports success.
FN_REPLY_LENGTH:
    ld hl,(FN_RXLEN_LO)
    ret

; A = APPBANK page 0..12. Selecting a page is a read hotspot. The selected
; page appears at $C000-$DFFF; code that performs the selection must remain
; in the resident $8000-$BFFF or $E000-$F7FF window.
FN_SELECT_APPBANK_PAGE:
    and $0F
    ld h,$FD
    add a,$80
    ld l,a
    ld a,(hl)
    ret

; B = appkey, A = mode (0 read, 1 write). Prepares OPEN_APPKEY with the
; required six raw payload bytes, including the reserved final zero. The
; caller posts it with FN_COMMIT_BEGIN and polls in later frames.
FN_APPKEY_OPEN_BEGIN:
    push af
    push bc
    ld d,FN_DEVICE_FUJI
    ld e,FN_CMD_APPKEY_OPEN
    ld b,0
    call FN_BEGIN
    ld a,FN_APPKEY_CREATOR_LO
    call FN_TX_BYTE
    ld a,FN_APPKEY_CREATOR_HI
    call FN_TX_BYTE
    ld a,FN_APPKEY_APP
    call FN_TX_BYTE
    pop bc
    ld a,b
    call FN_TX_BYTE
    pop af
    call FN_TX_BYTE
    xor a
    jp FN_TX_BYTE
