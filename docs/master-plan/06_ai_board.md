# 06 — AI Board

## Definición

El **AI Board** es el consejo de administración simulado de ForgeOS: múltiples perspectivas ejecutivas que evalúan un venture antes de gates críticos.

Complementa al AI CEO — el CEO opera día a día; el Board **delibera** en momentos de alto impacto.

## Estado

| Campo | Valor |
|-------|-------|
| Implementación | **Roadmap v3.0** |
| Base actual | Founder Advisor (perspectiva única challenge/proceed) |

## Miembros del Board

| Rol | Código | Foco principal |
|-----|--------|----------------|
| CEO | `ceo` | Visión, priorización, decisión final sintetizada |
| CTO | `cto` | Viabilidad técnica, stack, deuda, seguridad |
| CFO | `cfo` | Unit economics, runway, pricing, fundraising |
| CMO | `cmo` | Mercado, adquisición, posicionamiento, marca |
| CPO | `cpo` | Producto, MVP, UX, roadmap |
| CLO | `clo` | Legal, compliance, IP, términos |
| COO | `coo` | Operaciones, procesos, escalabilidad |
| QA Lead | `qa` | Calidad, riesgos de lanzamiento, testing |
| Growth Lead | `growth` | Retención, loops, experimentos |

## Cuándo se convoca el Board

| Gate | Miembros mínimos |
|------|------------------|
| Pre-build | CEO, CPO, CTO, CFO |
| Pre-launch | + CMO, QA, CLO |
| Pre-fundraise | + CFO (lead), CEO |
| Pivot mayor | Todos |
| Portfolio review | CEO, CFO, COO |

## Formato de deliberación

```
1. Brief del venture (auto-generado)
2. Cada miembro emite: stance + concerns + recommendation
3. Conflictos surfaced (ej. CTO vs CMO en scope)
4. CEO sintetiza: proceed / proceed-with-conditions / halt
5. Registro en Decision Log
```

### Stances por miembro

| Stance | Significado |
|--------|-------------|
| `strong_yes` | Aprueba sin reservas |
| `yes_with_conditions` | Aprueba si se cumplen condiciones |
| `neutral` | No bloquea, no impulsa |
| `concern` | Riesgos significativos |
| `no` | Recomienda no proceder |

## Ejemplo de salida (ilustrativo)

| Miembro | Stance | Concern principal |
|---------|--------|-------------------|
| CTO | yes_with_conditions | Marketplace requiere pagos — plan Stripe Connect |
| CFO | concern | CAC desconocido, LTV hipotético |
| CMO | strong_yes | Wedge vertical claro |
| CLO | yes_with_conditions | Términos de marketplace pendientes |
| **CEO síntesis** | proceed-with-conditions | Build MVP sin pagos en v1 |

## Inputs

- Todos los artefactos del venture (PRD, Research, Simulator, Build Plan)
- Forge DNA
- Timeline stage
- Brain principles

## Outputs

- `BoardDeliberation` — JSON estructurado por miembro
- `Conditions[]` — requisitos antes de siguiente gate
- Export PDF "Board Minutes" (futuro)

## Implementación progresiva

| Fase | Enfoque |
|------|---------|
| v3.0-alpha | 3 miembros (CEO, CTO, CPO) heurísticos |
| v3.0-beta | + CFO, CMO |
| v3.0 | Board completo + UI deliberación |
| v4.0+ | Board aprende de ventures del portfolio |

## Principios

1. **Divergencia útil** — el valor está en el debate, no en consenso falso
2. **Sin alucinación legal** — CLO marca "requiere abogado humano"
3. **Trazabilidad** — cada stance queda en Decision Log
4. **No bloqueo absoluto** — igual que CEO, fricción informada

## Relación con Founder Advisor (v0.1)

Founder Advisor es el **proto-Board**: una sola voz que desafía. AI Board lo generaliza a consejo multidisciplinar.
