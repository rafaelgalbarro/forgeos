# Protected Core — Program 4290

Paths declared **protected**. Changes require **Architecture Owner** review. Agents must stop and escalate if their task touches these without explicit assignment.

## Tier 0 — Application shell (never parallel-edit)

| Path | Reason |
|------|--------|
| `app/layout.tsx` | Root layout, global providers, font/theme |
| `app/page.tsx` | First experience entry (`FirstExperienceHome`) |
| `next.config.ts` | Build config, redirects, webpack/turbopack |
| `package.json` | Single dependency graph — one editor per wave |
| `tsconfig.json` | Path aliases, strict mode, compiler scope |

## Tier 1 — Navigation & layout

| Path | Reason |
|------|--------|
| `components/layout/` | `Sidebar`, `AppShell`, `PageHeader`, legacy banners |
| `components/navigation/` | *(reserved — nav lives in `lib/navigation/` today)* |
| `lib/navigation/` | `sidebar-items.ts`, `nav-config.ts`, `command-registry.ts`, `labs-registry.ts` |
| `components/os/ForgeOSShell.tsx` | OS shell routing |
| `components/os/OsSidebar.tsx` | OS sidebar |

## Tier 2 — Core engines (no behavior changes without program charter)

| Path | Owner team |
|------|------------|
| `lib/runtime/` | Runtime |
| `lib/ai-runtime/` | AI Runtime |
| `lib/executive-mesh/` | Executive |
| `lib/skills/` | Skills |
| `lib/skills-governance/` | Skills |
| `lib/capabilities/` | Skills |
| `lib/build-pipeline/` | Factories |
| `lib/real-build-flow/` | Factories |
| `lib/real-execution/` | Factories |
| `lib/build-engine/` | Factories |
| `lib/fos/` | Executive |
| `lib/board/` | Executive |

## Tier 3 — Protected during stabilization waves

| Path | Active programs |
|------|-----------------|
| `lib/command-center/` | 4500 |
| `lib/home/` | 4255 |
| `components/home/` | 4255 |
| `lib/production-readiness/` | 6500 |
| `lib/commercial/` | 6000 |
| `lib/intelligence-network/` | 9000 |

## What agents MAY do on protected paths

- **Read** for context
- **Document** in `docs/` (no code)
- **Propose** changes via Architecture Owner assignment

## What agents MUST NOT do

- Refactor, rename, or delete protected paths without charter
- Add imports from protected engines into docs-only or UX-only tasks
- Modify `package.json` scripts (`build`, `reset:dev`, `dev:fast`) in parallel waves
- Change primary sidebar order while 4100/4255 governance is active

## Escalation

If a task requires a protected path change:

1. Stop editing
2. Record the path and intended change in the PR description
3. Assign to Architecture Owner or named program owner
4. Re-run single-wave build after merge
