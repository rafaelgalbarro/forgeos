# Screenshots — Mission Control V2 experience fix

Automated browser capture was attempted against `http://localhost:3000/mission-control` after `reset:dev`.

## Captured evidence (HTTP smoke)

See `test-results.md` — all MC spine routes return **200** with `mc-*` chrome and **without** the previous `var(--fhis-color-surface, #fff)` white-card fallback in rendered HTML for `/mission-control`.

## Manual capture checklist (optional)

With `npm run reset:dev` running:

1. Desktop: `/mission-control` — dark cards, readable primary text, single header, one Pause/Auto-continue toolbar.
2. Narrow (~640px): workspace stacks; nav wraps.
3. `/review` — approvals/risks only (not a second MC page).
4. Empty / degraded / error states via RouteStatePanel.

Place optional PNGs in this folder as:

- `mc-desktop.png`
- `mc-narrow.png`
- `mc-review.png`
