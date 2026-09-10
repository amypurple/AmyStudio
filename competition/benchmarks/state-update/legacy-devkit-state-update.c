#include <coleco.h>
#include "state-update-sdcc-core.h"

static const byte silent_sound[] = { 0xff };
const sound_t snd_table[] = {
    { silent_sound, SOUNDAREA1 }
};

void nmi(void) { }

void main(void)
{
    run_state_update_benchmark();
    for (;;) { }
}
