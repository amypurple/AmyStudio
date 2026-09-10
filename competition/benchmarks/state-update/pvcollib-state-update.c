#include <coleco.h>
#include "state-update-sdcc-core.h"

void nmi(void) { }

void main(void)
{
    run_state_update_benchmark();
    for (;;) { }
}
