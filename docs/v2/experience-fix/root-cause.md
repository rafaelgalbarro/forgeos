# Mission Control V2 — Contrast Root Cause (audit before fix)

**Date:** 2026-07-24  
**Scope:** Presentation / experience only (no Canonical Domain / 6010, no command/handler changes).

## Verdict

Unreadable UI is caused by **undefined FHIS surface tokens with light (`#fff` / `#fafafa`) CSS fallbacks** on a **dark page** (`body` / `--fhis-color-bg: #09090b`, inherited text `#fafafa`). Cards paint white; text stays near-white → **white-on-white**.

Secondary issue: **stacked dual Mission Control** (`MissionControlV2View` overview + full `MissionControlShell`) produces a diagnostic, duplicated chrome (two headers, duplicate Pause / Auto-continue surfaces).

## Audit table

| File | Component | Class / token | Cause | Scope |
|------|-----------|---------------|-------|-------|
| `components/experience/MissionControlV2View.tsx` | `InfoCard` | `background: var(--fhis-color-surface, #fff)` | `--fhis-color-surface` **not defined** in `lib/design-system/css/tokens.css`; fallback `#fff` on dark body text | MC V2 overview cards |
| `components/experience/MissionControlV2View.tsx` | `Panel` | same `--fhis-color-surface, #fff` | Same | Plan / Outputs / Activity / Risks / Approvals panels |
| `components/experience/ProvenanceBadge.tsx` | badge tones | `--fhis-color-surface-muted, #e8e6e1` + light pastel hex; `color` fallback `#1a1a1a` for demo only | Light badge chips on dark chrome; inconsistent with page | All V2 pages using badge |
| `components/mission-control/MissionControlToolbar.tsx` | toolbar root | `--fhis-color-bg-subtle, #fafafa`, `--fhis-color-border, #eee` | Undefined tokens → light bar on dark page; text inherits light | Shell toolbar |
| `components/mission-control/MissionControlToolbar.tsx` | `ToolbarButton` / `Badge` | `--fhis-color-accent-subtle, #eff6ff` | Undefined → pale blue wash, poor contrast with light text | Lifecycle controls |
| `components/mission-control/AutoPilotToggle.tsx` | bar | `--fhis-color-border`, `--fhis-color-accent-muted` | Border OK once aliased; muted accent undefined | Duplicate auto-continue row under toolbar |
| `styles/fhis/os.css` | OS shell | `var(--fhis-color-surface)`, `var(--fhis-color-border)` | Used without definitions → transparent/invalid or inherited inconsistently | OS chrome (adjacent) |
| `components/experience/MissionControlExperience.tsx` | composition | stacks `MissionControlV2View` + `MissionControlClient` | Two Mission Control UIs: V2 header/panels **above** full legacy shell (own toolbar, autopilot, status, panels) | `/mission-control`, `/mission-control/[id]` |
| `lib/design-system/css/tokens.css` | `:root` | defines `--fhis-color-panel` / `--fhis-color-line` but **not** `surface` / `border` / `bg-subtle` aliases | Components reference newer alias names; fallbacks are light-theme leftovers | Global |

## Why header vs lower UI felt inconsistent

- Page / sidebar use dark FHIS (`--fhis-color-bg`, `--fhis-color-panel`, `--fhis-color-text`).
- V2 cards and toolbar fall back to **light** surfaces.
- Shell panels that use `--fhis-color-panel` / `--fhis-color-bg` correctly look dark → **split personality**.

## Fix strategy (tokens first)

1. Add semantic aliases on FHIS `:root`: `surface`, `surface-elevated`, `surface-muted`, `border`, `bg-subtle`, success/warning/danger/info.
2. Introduce Mission Control semantic vars `--mc-*` mapped to dark-coherent values (never white cards + dark-theme text tokens).
3. Drive MC cards/panels/badges from `--mc-*` / aliases — **not** per-card one-off colors.
4. Unify experience: one Header + Workspace + Nav; embed shell as workspace conversation/controls without a second stacked MC page.

## Non-causes (ruled out)

- Not a Query Layer / composition-root data bug (LIVE store loads; UI tokens fail).
- Not Canonical Domain Model (6010).
- Not missing mocks — mocks must not be introduced.
