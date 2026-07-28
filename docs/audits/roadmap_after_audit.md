# ForgeOS Master Audit V1.0 — Roadmap After Audit

**Fecha:** 2026-07-07

## Clasificación

| Prioridad | Definición |
|-----------|------------|
| **CRÍTICO** | Bloquea beta o seguridad |
| **ALTO** | Impacto alto en percepción producto |
| **MEDIO** | Deuda técnica / UX |
| **BAJO** | Nice-to-have post-launch |

---

## CRÍTICO

| # | Item | Impacto | Tiempo | Riesgo | ROI | Orden |
|---|------|---------|--------|--------|-----|-------|
| C1 | Auth + sesiones (Auth.js/Clerk) | Beta viable | 1–2 sem | Medio | Muy alto | 1 |
| C2 | Estabilidad host (CI clean build, no parallel dev+build) | Dev UX | 2–3 días | Bajo | Alto | 2 |
| C3 | Proteger APIs `real-*` con auth middleware | Seguridad | 3–5 días | Alto si no | Muy alto | 3 |
| C4 | Flujo único landing→onboarding→OS | Conversión | 1 sem | Bajo | Alto | 4 |
| C5 | Beta email waitlist real (Resend/SendGrid) | Beta ops | 3–5 días | Bajo | Alto | 5 |

---

## ALTO

| # | Item | Impacto | Tiempo | Riesgo | ROI | Orden |
|---|------|---------|--------|--------|-----|-------|
| A1 | Persistencia venture post-factory (DB) | Producto | 2 sem | Medio | Alto | 6 |
| A2 | Unificar `/founder` → `/os` redirects | UX | 3–5 días | Medio | Medio | 7 |
| A3 | Deploy preview E2E (flags on staging only) | Wow factor | 2 sem | Alto | Alto | 8 |
| A4 | `ENABLE_REAL_AI` staging con 1 provider | IA real | 1 sem | Medio | Alto | 9 |
| A5 | Ocultar labs de usuarios beta | UX | 2 días | Bajo | Medio | 10 |
| A6 | Tests E2E Playwright flujo feliz | Calidad | 1–2 sem | Bajo | Alto | 11 |
| A7 | Deploy Vercel staging documentado | GTM | 2–3 días | Bajo | Alto | 12 |

---

## MEDIO

| # | Item | Impacto | Tiempo | Riesgo | ROI | Orden |
|---|------|---------|--------|--------|-----|-------|
| M1 | Deprecar `lib/fos/` | Mantenibilidad | 2–3 sem | Medio | Medio | 13 |
| M2 | Unificar build-engine → build-platform | Mantenibilidad | 2 sem | Medio | Medio | 14 |
| M3 | Completar OS Labs index (factories) | Descubrimiento | 1 día | Bajo | Bajo | 15 |
| M4 | Bundle analyzer + lazy routes | Performance | 1 sem | Bajo | Medio | 16 |
| M5 | Unificar `/capital` bajo OS | UX | 2 días | Bajo | Medio | 17 |
| M6 | axe accessibility pass | Compliance | 3–5 días | Bajo | Medio | 18 |
| M7 | Reducir barrels pesados | Build time | 1–2 sem | Medio | Medio | 19 |

---

## BAJO

| # | Item | Impacto | Tiempo | Riesgo | ROI | Orden |
|---|------|---------|--------|--------|-----|-------|
| B1 | Stripe billing integration | Comercial | 2–3 sem | Medio | Alto (post-beta) | 20 |
| B2 | SSO enterprise real | Enterprise | 3–4 sem | Alto | Medio | 21 |
| B3 | Marketplace install real | Ecosystem | 3 sem | Alto | Medio | 22 |
| B4 | Network backend real | Network | 4+ sem | Alto | Bajo corto plazo | 23 |
| B5 | Self-evolution GitHub API real | 2035 | 2 sem | Alto | Bajo | 24 |

---

## Hitos recomendados

```
Semana 1–2:  C1, C2, C3, C4, C5
Semana 3–4:  A1, A5, A6, A7
Semana 5–6:  A3, A4, beta cohort 10 usuarios
Semana 7–8:  feedback loop, M1, M2
Beta pública: semana 9+ (si métricas OK)
```

---

## ROI esperado

| Inversión | Retorno |
|-----------|---------|
| Auth + flujo único | Beta medible, retención |
| E2E deploy staging | Case study inversores |
| Scope reduction | -40% bugs reportados |
| Consolidación fos/build | -25% tiempo mantenimiento |
