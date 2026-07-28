# Token changes — Mission Control contrast

## Root cause

Undefined `--fhis-color-surface` / `--fhis-color-border` / `--fhis-color-bg-subtle` with **light CSS fallbacks** (`#fff`, `#eee`, `#fafafa`) on a dark page → white cards + near-white text.

## Added / aliased (`lib/design-system/css/tokens.css`)

| Token | Value / maps to |
|-------|-----------------|
| `--fhis-color-bg-subtle` | `#0c0c0f` |
| `--fhis-color-text-secondary` | `#d4d4d8` |
| `--fhis-color-accent-subtle` / `--fhis-color-accent-muted` | lime-tinted dark washes |
| `--fhis-color-surface` | `var(--fhis-color-panel)` |
| `--fhis-color-surface-elevated` | `#16161a` |
| `--fhis-color-surface-muted` | `#1a1a1f` |
| `--fhis-color-border` | `var(--fhis-color-line)` |
| `--fhis-color-success*` / `warning*` / `danger*` / `info*` | semantic dark-coherent |
| `--mc-background` | `var(--fhis-color-bg)` |
| `--mc-surface` | `var(--fhis-color-surface)` |
| `--mc-surface-elevated` | elevated panel |
| `--mc-border` | border |
| `--mc-text-primary` / `secondary` / `muted` | text ladder |
| `--mc-accent` | accent |
| `--mc-success` / `warning` / `danger` / `info` | status |

## Rule

Prefer dark cards + light text. **Never** white cards with dark-theme text tokens. MC UI uses `--mc-*` (and FHIS aliases), not per-card one-offs.
