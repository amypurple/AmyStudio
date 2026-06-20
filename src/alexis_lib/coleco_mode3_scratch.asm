; -----------------------------------------------------------------------------
; ALEXIS Mode 3 multicolor geometry scratch-area EQU map
; All aliases into AMY_BUFFER32 ($7000). No executable code.
; Mode 3 and Mode 1 drawing are mutually exclusive at runtime; these EQUs
; occupy the same physical RAM as the AMY_MODE1_* scratch without conflict.
; -----------------------------------------------------------------------------

AMY_MODE3_GEOMETRY_SCRATCH:
; HLINE scratch ($7000-$7001)
AMY_MODE3_HLINE_COLOR   EQU AMY_BUFFER32+0
AMY_MODE3_HLINE_PACKED  EQU AMY_BUFFER32+1

; Bresenham LINE scratch ($7000-$700C) — overlaps HLINE; LINE never calls HLINE
; except as a tail call at entry when dy=0, at which point LINE scratch is abandoned.
AMY_MODE3_LINE_X1       EQU AMY_BUFFER32+0
AMY_MODE3_LINE_Y1       EQU AMY_BUFFER32+1
AMY_MODE3_LINE_X2       EQU AMY_BUFFER32+2
AMY_MODE3_LINE_Y2       EQU AMY_BUFFER32+3
AMY_MODE3_LINE_SX       EQU AMY_BUFFER32+4
AMY_MODE3_LINE_SY       EQU AMY_BUFFER32+5
AMY_MODE3_LINE_DX       EQU AMY_BUFFER32+6
AMY_MODE3_LINE_DY       EQU AMY_BUFFER32+7
AMY_MODE3_LINE_ERR      EQU AMY_BUFFER32+8
AMY_MODE3_LINE_TMP      EQU AMY_BUFFER32+10
AMY_MODE3_LINE_COLOR    EQU AMY_BUFFER32+12

; BOX scratch ($7002-$7004) — survives HLINE calls (HLINE only uses $7000-$7001)
AMY_MODE3_BOX_X1        EQU AMY_BUFFER32+2
AMY_MODE3_BOX_Y2        EQU AMY_BUFFER32+3
AMY_MODE3_BOX_COLOR     EQU AMY_BUFFER32+4
