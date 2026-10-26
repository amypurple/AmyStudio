# Circus and Southern States input fixes (2026-10-26)

## Circus

The title animation's outer twenty-step loop used the global byte `K`. `SetSetColors` also used
`K` for its three screen thirds. Because Amy variables are global unless declared as routine
locals, every color update reset the caller's loop counter and the outer loop repeatedly returned
to step four.

`SetSetColors` now uses the dedicated `ColorBand` counter. The twenty color rotations and march
remain intact, and GearColeco reaches the `PLAY / INSTRUCTIONS` menu. NMI is also enabled before
the editorial page so its initial `pause until press` always receives controller updates.

The existing pending sound-table correction that places the first theme area at `$702B` is
preserved; the clean repository already contained that correction.

## Southern States

The program disabled NMI during setup and never enabled it again. `choose keypad` waits on frames
and reads the OS7 controller tables, so stale controller state made selection appear intermittent
or freeze indefinitely. NMI is now enabled immediately after the initialized screen is turned on.

GearColeco proceeds from the instructions to the map, displays four state choices, accepts keypad
`1`, and clears the selected wrong answer as intended.

## Verification

- Balanced and Aggressive builds succeed for both programs.
- Circus Balanced ROM: 6,979 occupied bytes.
- Southern States Balanced ROM: 5,093 occupied bytes.
- Direct GearColeco captures verify the Circus menu and a processed Southern States keypad choice.
- Full Balanced corpus: 299/299 examples compile and 298 ROMs assemble.
