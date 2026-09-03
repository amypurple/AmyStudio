# ColecoVision game-flow conventions for Amy projects

Date: 2026-08-02

Amy Studio preserves useful Coleco Industries-era interaction conventions without pretending every commercial cartridge followed them.

## Recommended game-over flow

- `*` means replay or start a game.
- `#` means return to the options or menu screen.
- The accepted key release is consumed before control returns, so it cannot trigger an immediate action in the next scene.
- A held game-over screen blanks after five seconds while NMI, sound, timers, and controller scanning continue.
- The original VDP display bit is restored after the accepted key is released.

```basic
const KeyReplay = 10
const KeyMenu = 11
u8 GameOverChoice = 0

sub GameOver:
  print centered at 21, "GAME OVER"
  print centered at 22, "* REPLAY   # MENU"

  choose keypad KeyReplay to KeyMenu into GameOverChoice sleep after 5 seconds

  select case GameOverChoice
    case KeyReplay
      StartGame
    case KeyMenu
      ShowOptions
  end select
  return
```

Add `on keypad 1` or `on keypad 2` when the game must accept only one controller. Without it, either keypad is accepted.

## Action-button pauses

Use this when any fire/action button should continue:

```basic
pause until press and release sleep after 10 seconds
```

The unqualified form accepts either controller, both standard side buttons, and all four Super Action Controller action buttons.

## BIOS menu direction

Future BIOS-menu integration should preserve the same meanings: `*` starts or resumes and `#` returns to options. Games may deliberately override the convention when their original design requires it, but examples should state the exception rather than silently inventing another mapping.
