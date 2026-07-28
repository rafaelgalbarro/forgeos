# 04 — Founder Advisor

## Rol

Simular la voz de un **cofundador senior** que desafía, no solo valida. Combina análisis de riesgo, oportunidades y alternativas accionables.

## Ubicación

`lib/intelligence/founder-advisor.ts`

## Stances (posturas)

| Stance | Significado | Efecto en score |
|--------|-------------|-----------------|
| `challenge` | Idea frágil o mercado hostil | −15 Startup Score |
| `caution` | Viable con reservas | −8 |
| `proceed` | Señales favorables | +5 |

## Estructura de salida

```typescript
FounderAdvisorOutput {
  headline, summary, stance,
  risks[], opportunities[], alternatives[],
  recommendations[], questions[],
  shouldCompare
}
```

## Cómo desafía ideas

1. **Patrones de mercado** — marketplace, pádel+reservas, ayudas públicas
2. **Competencia implícita** — Playtomic, incumbentes por vertical
3. **Preguntas incómodas** — quién paga, primeros 50 usuarios, por qué no WhatsApp
4. **Alternativas** — pivotes con menor cold start (ej. B2B SaaS vs marketplace)

## Enriquecimiento con Discovery

`getDiscoveryFounderRecommendations()` añade recomendaciones si el usuario confirmó:

- Modelo C2C
- Monetización elegida
- Pagos en plataforma
- Wedge vertical

## Preguntas (máx. 5)

Generadas según tags y stance:

- Siempre: quién paga, problema v1, primeros usuarios
- Marketplace: oferta vs demanda, alternativa a WhatsApp
- B2B: ciclo de venta
- Challenge: evidencia vs alternativas

## UI

- Studio Home: `FounderAdvisorPanel` en preview
- Intelligence Report: sección completa
- Venture Workspace: sección "Founder Advisor"

## Evolución IA

El Advisor heurístico será reemplazable por un LLM que reciba:

- `ForgeIntelligenceReport`
- `discoveryContext`
- Entradas relevantes de Knowledge Engine

Manteniendo stances y estructura de salida para compatibilidad.

## Regla de oro

> Si la idea suena bien pero el mercado es brutal, el Advisor debe decirlo antes del código.
