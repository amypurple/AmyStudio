# Voice Module support

Amy supports the ColecoVision SP0256-AL2 speech adapters used by the Lundy and
EVE voice modules. The debugger can simulate an absent module or either adapter
profile without requiring physical hardware.

```amy
u8 module = 0
u8 ready = 0
u8 speaking = 0

voice detect into module
voice reset module
voice ready module into ready
voice allophone $2D using module
voice speak Phrase using module
voice start Phrase using module
voice speaking into speaking
voice stop

data Phrase bytes
  $2D,$14,$FF
end data
```

`voice speak` blocks until the phrase finishes. `voice start` queues the phrase
and lets the game continue; Amy services that queue from the frame interrupt.
Indexed word tables can select phrases at runtime. The debugger's external
hardware setting controls whether detection reports no module, Lundy, or EVE.

The bundled GearColeco test core includes SP0256 microsequencer/LPC emulation,
module-specific I/O mapping, busy/ready timing, and mixed stereo output.
