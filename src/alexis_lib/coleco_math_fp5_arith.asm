; -----------------------------------------------------------------------------
; ALEXIS fp5 heavy arithmetic umbrella
; Splits heavy math into multiply, divide, sqrt, and transcendental helpers.
; -----------------------------------------------------------------------------

    include "src/alexis_lib/coleco_math_fp5_mul.asm"
    include "src/alexis_lib/coleco_math_fp5_div64.asm"
    include "src/alexis_lib/coleco_math_fp5_div.asm"
    include "src/alexis_lib/coleco_math_fp5_sqrt.asm"
    include "src/alexis_lib/coleco_math_fp5_trans.asm"
