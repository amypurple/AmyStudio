; DAN1.asm - DAN1 Decompression Routine
; =============================================================================
; LZSS Compression by Amy Bienvenu (2016)
; =============================================================================
; IN: HL -> Source compressed data
;     DE -> Destination VRAM address
; =============================================================================
; Timing note:
; - The copy-from-offset loop still keeps all NOPs because it alternates VRAM
;   read and write address setup inside the hot path.
; - Amy Bienvenu tested this timing on real ColecoVision
;   hardware while developing the routine, so these NOPs are not speculative.
; - Future optimization candidate: verify whether the post-IN triple NOP can be
;   reduced without violating VDP turnaround timing.
dan1_decompress:
	; Set Write in VRAM at DE
	ld	c,$bf
	out	(c),e
	set	6,d
	out	(c),d
	res	6,d
	; Set A for reading a bit routine
	ld	a,$80

; Copy literal byte
dan1_copy_byte:
	ld	b,$01
	jr	dan1_literal2main

dan1_special:
	pop	de
	call	dan1_getbit
	ret	nc
	ld	b,$1a
	call	dan1_literals
        ld      b, (hl)                 ; load counter value (8 bits)
	inc	b
dan1_literal2main:
	call	dan1_literals

; Main loop
dan1_main_loop:
	call	dan1_getbit                    ; check next bit
	jr	c,dan1_copy_byte
	
; Elias gamma decoding + Special marker
        push	de
        ld	de, $0001
        ld	b,d	
dan1_eliasgamma_0:
        inc	b
	call	dan1_getbit			; check next bit
	jr      c, dan1_eliasgamma_value
	bit	4,b
        jr      nz, dan1_special	; special marker "0000000000000000"
	jr	dan1_eliasgamma_0
dan1_eliasgamma_value_loop:
        call	dan1_getbite			; check next bit -> DE
        rl      d
dan1_eliasgamma_value:
	djnz	dan1_eliasgamma_value_loop
	push	de
	pop	bc			; BC = LENGTH
	
; Get Offset value
	ld	d,$00		; Reset Offset to $0000
	
; ON LEN GOTO TWO_OFFSETS, THREE_OFFSETS
; GOTO FOUR_OFFSETS

	ex	af,af'
	ld	a,b
	or	a
	jr	z, dan1_bzero
	ld	a,$03
dan1_bzero:
	or	c
	ld	e,a
	ex	af,af'
	dec	e
	jr	z, dan1_offset2
	dec	e
	jr	z, dan1_offset3
	ld	e,d

dan1_offset4:
	call	dan1_getbit			; check next bit
	jr	nc, dan1_offset3
        call	dan1_getnibblee			; get next nibble -> E
	inc	e
	ld	d,e				; D = E+1
	jr	dan1_offset3a
dan1_offset3:
	call	dan1_getbit			; check next bit
	jr	nc, dan1_offset2
dan1_offset3a:
        ld      e, (hl)			; load offset offset value (8 bits)
        inc     hl
	ex	af, af'
	ld	a,e
	add	a,$12
	ld	e,a
	jr	nc, dan1_offset3b
	inc	d
dan1_offset3b:
	ex	af,af'
	jr	dan1_copy_from_offset
dan1_offset2:
	call	dan1_getbit			; check next bit
	jr      nc, dan1_offset1
        call	dan1_getnibblee			; get next nibble -> E
	inc	e
	inc	e
	jr	dan1_copy_from_offset
dan1_offset1:
	call	dan1_getbit			; check next bit
	rl	e
	
; Copy previously seen bytes
dan1_copy_from_offset:
        ex      (sp), hl                ; store source, restore destination
        push    hl                      ; store destination
	scf
        sbc     hl, de                  ; HL = source = destination - offset - 1
        pop     de                      ; DE = destination
	; BC = count
	; COPY BYTES
	ex	af,af'
	set	6,d
dan1_copybytes_loop:
	push	bc
	ld	c,$bf
	out	(c),l
	nop
	out	(c),h
	inc	hl
	nop
	nop
	in	a,($be)
	nop
	nop
	nop
	out	(c),e
	nop
	out	(c),d
	inc	de
	nop
	nop
	out	($be),a
	pop	bc
	dec	bc
	ld	a,b
	or	c
	jr	nz, dan1_copybytes_loop
	res	6,d
	ex	af,af'
        pop	hl		; restore source address (compressed data)
        jp	dan1_main_loop
	
dan1_literals:
	ld	c,$be
dan1_literals_loop:
	outi
	inc	de
	ret	z
	jr	dan1_literals_loop

dan1_getnibblee:
        call	dan1_getbite	; get next bit -> E
        call	dan1_getbite	; get next bit -> E
        call	dan1_getbite	; get next bit -> E
dan1_getbite:
        call	dan1_getbit	; get next bit
        rl      e		; push bit into E
	ret

; get a bit
dan1_getbit:
	add	a,a
  	ret	nz
	ld	a,(hl)
	inc	hl
	rla
	ret
