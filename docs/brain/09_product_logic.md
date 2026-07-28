# 09 — Product Logic

## Rol del Product Worker

Transformar investigación + idea en un **PRD accionable** con MVP acotado y roadmap 30/60/90.

## Ubicación

```
lib/workers/implementations/product.ts
lib/ai/provider.ts (generateProductPRD)
lib/ai/prompts/product.ts
app/api/generate/product/route.ts
```

## Esquema PRD (inglés en campos)

Campos clave: `executiveSummary`, `problemStatement`, `mvpScope`, `userStories`, `mainScreens`, `coreFlows`, `roadmap30_60_90`, `assumptions`, `risks`, `successMetrics`.

## Jerarquía de contexto en prompt

1. **discoveryContext** — decisiones del usuario (prioridad máxima)
2. **researchReport** — contexto principal de mercado
3. **idea + knowledgeRefs** — complemento

## Reglas de producto

- MVP: 4–8 semanas, máx. 5–7 items en `mvpScope`
- Hipótesis en `assumptions`
- Métricas medibles en `successMetrics`
- Sin cifras de revenue inventadas

## Dependencia de Research

Product Worker recibe `researchReport` vía metadata de BuildFlow después de que Research termina. Si falta, basa PRD en idea + discovery.

## Salida en venture

- `venture.productPRD` — datos
- `venture.productPRDSource` — ai | mock
- `venture.productMeta` — usedResearch, fallbackUsed, etc.
- Secciones: PRD, MVP, Wireframes, Roadmap

## Relación con Simulator

PRD acotado → `productBonus` en Venture Score  
`mvpScope.length ≤ 7` → bonus adicional

## Filosofía

> El PRD no describe el producto soñado — describe el **experimento mínimo** que reduce incertidumbre.

## Evolución

- User story → ticket export
- Sincronización con Figma/wireframes reales
- PRD v2 tras feedback de usuarios
