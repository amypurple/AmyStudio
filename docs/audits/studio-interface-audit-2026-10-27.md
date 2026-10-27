# Amy Studio interface audit - 2026-10-27

The current Studio was exercised on desktop and at a 390x667 touch viewport. Project creation,
the persistent-project layout, main menu, example browser, fullscreen emulation, project FILES
actions, graphics and ICVGM editors, Sound FX, Tiny Sound, and browser-side ADAM media generation
all pass their focused tests.

At widths below 1100 pixels, the generic dropdown rule could move the right-edge hamburger panel
outside the viewport. Its position also varied when persistent project tabs changed wrapping. The
hamburger now remains at the right edge, opens inward, owns bounded vertical scrolling and accepts
`pan-y` touch gestures. The mobile regression opens every menu section and proves both-axis
containment and scrolling before testing Enter and touch project creation.

Prioritized follow-up remains: reduce the 144-pixel mobile header, enlarge small touch targets,
add a reusable all-dialog geometry test at desktop/tablet/phone sizes, defer large ASM-listing DOM
rendering, and provide consistent high-contrast `:focus-visible` styling.
