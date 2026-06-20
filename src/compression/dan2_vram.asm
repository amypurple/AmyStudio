; dan2.s
; Decompression in VRAM version by Daniel Bienvenu
;
; HL = SOURCE
; DE = DESTINATION
;
; Timing note:
; - The copy-from-offset loop keeps its NOP padding for now because it performs
;   a VRAM read followed by a VRAM write retarget on every copied byte.
; - Amy Bienvenu tested this timing on real ColecoVision
;   hardware while developing the routine, so the current spacing is deliberate.
; - Future optimization candidate: re-measure the post-IN and post-write-address
;   gaps; they are the most likely places where one or two cycles may be recoverable.

dan2_decompress:

	; Set A for reading a bit routine
	ld	a,$80

; Decode size for high offset values
	push	ix
	;	Set max offset size to 10 bits
	ld	ix, dan2_getbite-3
dan2_offsetsize_loop:
	call	dan2_getbit
	jr	nc,dan2_offsetsize_end
	;	Add +1 bit to max offset size (add one more call getbitee)
	dec	ix
	dec	ix
	dec	ix
	jr	dan2_offsetsize_loop
dan2_offsetsize_end:

	; Set Write in VRAM at DE
	ld	c,$BF
	out	(c),e
	set	6,d
	out	(c),d
	res	6,d

; Copy 1 literal byte
dan2_copy_byte:
	ld	c, $BE
	outi
	inc	de

; Main loop
dan2_main_loop:
	call	dan2_getbit
	jr	c,dan2_copy_byte

; Elias gamma decoding + Special marker
	push	de
	ld	de, $0001
	ld	b,d
dan2_eliasgamma_0:
	inc	b
	call	dan2_getbit
	jr      c, dan2_eliasgamma_value
	bit	4,b
	jr	z, dan2_eliasgamma_0
	pop	de
	pop	ix
	ret
dan2_eliasgamma_value_loop:
	call	dan2_getbite
	rl      d
dan2_eliasgamma_value:
	djnz	dan2_eliasgamma_value_loop
	push	de
	pop	bc

; Get Offset value
	ld	d,$00

; ON LEN GOTO TWO_OFFSETS, THREE_OFFSETS
; GOTO FOUR_OFFSETS

	ex	af,af'
	ld	a,b
	or	a
	jr	z, dan2_bzero
	ld	a,$03
dan2_bzero:
	or	c
	ld	e,a
	ex	af,af'
	dec	e
	jr	z, dan2_offset2
	dec	e
	jr	z, dan2_offset3
	ld	e,d

dan2_offset4:
	call	dan2_getbit
	jr	nc, dan2_offset3
	call	dan2_gethighbitse
	inc	e
	ld	d,e
	jr	dan2_offset3a
dan2_offset3:
	call	dan2_getbit
	jr	nc, dan2_offset2
dan2_offset3a:
	ld      e, (hl)
	inc     hl
	ex	af, af'
	ld	a,e
	add	a,$12
	ld	e,a
	jr	nc, dan2_offset3b
	inc	d
dan2_offset3b:
	ex	af,af'
	jr	dan2_copy_from_offset
dan2_offset2:
	call	dan2_getbit
	jr      nc, dan2_offset1
	call	dan2_getnibblee
	inc	e
	inc	e
	jr	dan2_copy_from_offset
dan2_offset1:
	call	dan2_getbit
	rl	e

; Copy previously seen bytes
dan2_copy_from_offset:
	ex      (sp), hl
	push    hl
	scf
	sbc     hl, de
	pop     de
	; BC = count
	; COPY BYTES
	ex	af,af'
	set	6,d
dan2_copybytes_loop:
	push	bc
	ld	c,$BF
	out	(c),l
	nop
	out	(c),h
	inc	hl
	nop
	nop
	in	a,($BE)
	nop
	nop
	nop
	out	(c),e
	nop
	out	(c),d
	inc	de
	nop
	nop
	out	($BE),a
	pop	bc
	dec	bc
	ld	a,b
	or	c
	jr	nz, dan2_copybytes_loop
	res	6,d
	ex	af,af'
	pop	hl
	jp	dan2_main_loop

dan2_gethighbitse:
	jp	(ix)
; LIMIT OFFSET SIZE TO 2^14 = 16K
	call	dan2_getbite
	call	dan2_getbite
dan2_getnibblee:
	call	dan2_getbite
	call	dan2_getbite
	call	dan2_getbite
dan2_getbite:
	call	dan2_getbit
	rl      e
	ret

; get a bit
dan2_getbit:
	add	a,a
	ret	nz
	ld	a,(hl)
	inc	hl
	rla
	ret
