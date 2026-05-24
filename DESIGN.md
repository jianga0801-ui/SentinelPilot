# SentinelPilot Design Notes

## Visual Direction

SentinelPilot uses a calm operations-console vocabulary: dense information, warm off-white light mode, deep low-glare dark mode, restrained borders, and theme accents used for navigation, focus, and state.

## Theme Tokens

- Accent palettes: violet, azure, jade, ember.
- Dark text should use warm cream or muted metal tones, not pure white.
- Dark dividers should stay low contrast and never become bright white row stripes.
- Online and ready states use consistent pill sizes and semantic colors.

## Interaction Rules

- Sidebar is a persistent first-level navigation surface.
- Sidebar can collapse to icon-only mode and resize by dragging the right edge.
- Health and integration status belongs in the dashboard, not in a duplicated sidebar status block.
- Settings rows should prefer selects for bounded values and examples/placeholders for free-form values.

## Copy Rules

- Chinese mode uses Chinese UI labels. Technical IDs and raw security evidence may remain raw when they are evidence, but should not be used as primary interface copy.
- English mode uses the same layout and state logic as Chinese mode.
