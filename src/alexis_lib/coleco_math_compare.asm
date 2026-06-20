; -----------------------------------------------------------------------------
; ALEXIS numeric compare helpers — umbrella include
; For selective builds include the split modules directly:
;   coleco_math_compare_small.asm  — CMP_U8, CMP_S8, CMP_U16, CMP_S16
;   coleco_math_compare_u32.asm    — CMP_U32_MEM  (needed by AMY_U32_TO_ASCII10)
;   coleco_math_compare_s32.asm    — CMP_S32_MEM
; -----------------------------------------------------------------------------

    include "src/alexis_lib/coleco_math_compare_small.asm"
    include "src/alexis_lib/coleco_math_compare_u32.asm"
    include "src/alexis_lib/coleco_math_compare_s32.asm"
