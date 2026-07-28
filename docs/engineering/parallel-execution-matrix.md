# Parallel Execution Matrix — Program 4290

Which ForgeOS programs may run **in parallel** vs **must be serialized**. Based on completed programs in repo and active code ownership.

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Safe to run in parallel (disjoint paths) |
| ⚠️ | Parallel with coordination (shared read-only deps) |
| ❌ | Incompatible — serialize or single agent |
| ✓ | Completed in repo |

## Foundation wave (4000–4290) — COMPLETADO

| Program | Name | Status | Parallel with |
|---------|------|--------|---------------|
| **4000** ✓ | Founder Zero | COMPLETADO | 4100 ✅, 4200 ✅, docs-only ✅ |
| **4100** ✓ | Product Cleanup & UX | COMPLETADO | 4000 ✅, 4200 ⚠️ (both touch routes) |
| **4200** ✓ | Stabilization | COMPLETADO | 4100 ⚠️, 4250 ✅ |
| **4250** ✓ | Localhost Performance | COMPLETADO | 4200 ✅, 4255 ⚠️ (both touch `/`) |
| **4255** ✓ | First Experience | COMPLETADO | 4250 ⚠️, 4100 ❌ (same nav registry) |
| **4290** ✓ | Engineering Governance | COMPLETADO | All docs-only ✅ |

### Foundation incompatibilities

| Pair | Why |
|------|-----|
| 4100 + 4255 | Both edit `lib/navigation/sidebar-items.ts`, `nav-config.ts` |
| 4250 + 4255 | Both edit `app/page.tsx`, `components/home/` |
| Any + `npm run build` | Single build per wave — see [build-policy.md](./build-policy.md) |

## Active product programs (4300–4999)

| Program | Name | Status | Parallel with |
|---------|------|--------|---------------|
| **4500** | Command Center | ACTIVE | 6000 ✅, 6500 ✅, 8000 ✅, 9000 ✅ |
| **4300–4499** | *(reserved)* | — | Serialize with 4500 if touching `lib/command-center/` |

### 4500 constraints

- ❌ Parallel with Runtime/AI/Mesh/Skills engine refactors
- ❌ Parallel with another agent editing `lib/command-center/summary-loader.ts` (4250 overlap)
- ✅ Parallel with Commercial (6000), Production (6500), Network (9000) — read-only panel deps

## Commercial & operations (6000–6999)

| Program | Name | Status | Parallel with |
|---------|------|--------|---------------|
| **6000** | Commercial Readiness | ACTIVE | 6500 ✅, 8000 ✅, 9000 ✅, docs ✅ |
| **6500** | Production Readiness | ACTIVE | 6000 ✅, 8000 ✅, 9000 ✅ |

### 6000 / 6500 constraints

- ❌ Both editing `lib/launch/changelog.ts` simultaneously
- ❌ Parallel `package.json` changes
- ✅ Disjoint UI: `/billing` vs `/production`

## Customer & network (8000–9999)

| Program | Name | Status | Parallel with |
|---------|------|--------|---------------|
| **8000** | Customer Success | ACTIVE | 6000 ✅, 9000 ⚠️ (shared design-partners data) |
| **9000** | Intelligence Network | ACTIVE | 8000 ⚠️, 6000 ✅ |

### 8000 / 9000 constraints

- ⚠️ Share `lib/design-partners/` read paths — one writer at a time
- ✅ UI routes disjoint: `/customer-success` vs `/network`

## Venture validation (10000+)

| Program | Name | Status | Parallel with |
|---------|------|--------|---------------|
| **10000** | Venture E2E | ACTIVE | 4000 ✅ (fixture only), 4500 ✅, docs ✅ |

### 10000 constraints

- ❌ Parallel edits to `lib/fixtures/aurea-facilities-venture.ts` + `lib/venture-e2e/`
- ✅ Parallel with governance/docs programs

## RC engine series (labs)

| RC | Domain | Parallel with same domain |
|----|--------|---------------------------|
| RC1–RC2 | Runtime | ❌ |
| RC4.x | Skills | ❌ |
| RC5 | Real connections / build flow | ❌ |
| RC6 | AI Runtime | ❌ |
| RC6.5 | Autonomous org | ❌ (shares executive deps) |
| RC7 | Venture Factory | ❌ with RC5.2 |
| RC8 | Venture Intelligence / Capital | ⚠️ |
| RC9 | Ecosystem / SDK | ✅ with 6000 |
| RC10 | Network | ❌ with 9000 writer |
| RC11 | Enterprise | ✅ with 8000 |

## Safe parallel bundles (recommended)

| Bundle | Programs | Condition |
|--------|----------|-----------|
| **Docs wave** | 4290 + any | `docs/` only, no `lib/` |
| **Ops wave** | 6000 + 6500 | No shared files; single build at end |
| **Insights wave** | 8000 + 9000 | One writer on `design-partners`; read-only elsewhere |
| **Validation wave** | 4000 + 10000 | Fixture frozen; lab-only edits |

## Never parallel

| Action | Rule |
|--------|------|
| `npm run build` / `reset:dev` | One Architecture Owner per wave |
| `package.json` | One editor per wave |
| `lib/navigation/sidebar-items.ts` | One UX agent |
| `app/layout.tsx` / `app/page.tsx` | One agent |
| Protected core engines | One team per engine — see [protected-core.md](./protected-core.md) |
