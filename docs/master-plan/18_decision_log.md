# 18 — Decision Log

## Propósito

Registro de **decisiones estratégicas y arquitectónicas** de ForgeOS para trazabilidad con desarrolladores, socios e inversores.

Formato inspirado en ADR (Architecture Decision Records).

---

## DL-001 — ForgeOS no es un app builder

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07 |
| Estado | Aceptada |
| Contexto | Riesgo de percepción como competidor de Lovable/Bolt |
| Decisión | Posicionar como AI Venture Studio / OS de startups |
| Consecuencias | Priorizar decisión y docs sobre generación de código |

---

## DL-002 — Decision-first antes de code-first

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07 |
| Estado | Aceptada |
| Contexto | Fundadores construyen antes de validar |
| Decisión | Venture Simulator + gates antes de Build Flow |
| Consecuencias | UI Intelligence obligatoria; Simulator en workspace |

---

## DL-003 — Usuario decide; sistema recomienda

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07 |
| Estado | Aceptada |
| Contexto | Debate sobre bloquear builds de bajo score |
| Decisión | Fricción informada, nunca hard lock |
| Consecuencias | `do_not_build_yet` es warning, no error |

---

## DL-004 — Honestidad epistémica

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07 |
| Estado | Aceptada |
| Contexto | IA tiende a inventar métricas de mercado |
| Decisión | Prohibir cifras falsas; marcar hipótesis |
| Consecuencias | Prompts Research/Product + reglas Brain |

---

## DL-005 — IA selectiva, no universal

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07 |
| Estado | Aceptada |
| Contexto | Coste y control de calidad |
| Decisión | Solo Research + Product con API; resto heurístico v0.1 |
| Consecuencias | Mock fallback; sin key el flujo completa |

---

## DL-006 — localStorage en v0.1

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07 |
| Estado | Aceptada (temporal) |
| Contexto | Velocidad de iteración; Supabase fuera de scope |
| Decisión | Persistencia client-side hasta v2 prep |
| Consecuencias | Sin multi-device; disclaimer al usuario |

---

## DL-007 — Brain spec separado de Master Plan

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07 |
| Estado | Aceptada |
| Contexto | Dos audiencias: ingeniería operativa vs estrategia |
| Decisión | `docs/brain/` operativo + `docs/master-plan/` estratégico |
| Consecuencias | Mantener sincronizados en revisiones mayores |

---

## DL-008 — Build Plan heurístico

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07 |
| Estado | Aceptada |
| Contexto | Sprint 18 — handoff sin nuevo provider IA |
| Decisión | Build Plan por heurísticas + contexto existente |
| Consecuencias | "Pendiente" cuando falta data; mejora en v5 |

---

## DL-009 — Master Plan v1.0 sin cambios de código

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07 |
| Estado | Aceptada |
| Contexto | Sprint 19 — documentar antes de escalar features |
| Decisión | Solo docs en `docs/master-plan/` |
| Consecuencias | Roadmap v2+ guía próximos sprints |

---

## DL-010 — AI CEO antes que AI Board

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07 |
| Estado | Aceptada |
| Contexto | Complejidad de implementación |
| Decisión | v2.0 CEO, v3.0 Board |
| Consecuencias | Founder Advisor como proto-Board en v0.1 |

---

## Plantilla para nuevas decisiones

```markdown
## DL-XXX — Título

| Campo | Valor |
|-------|-------|
| Fecha | YYYY-MM |
| Estado | Propuesta / Aceptada / Obsoleta |
| Contexto | ... |
| Decisión | ... |
| Consecuencias | ... |
```

## Revisiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-07 | Decisiones iniciales Sprint 19 |
