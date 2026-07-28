# 15 — Principios de ingeniería

## Propósito

Definir **cómo se construye ForgeOS** para que el código permanezca mantenible al escalar de v0.1 a v10.

## Stack actual (v0.1)

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript strict |
| UI | React 19, CSS custom (globals.css) |
| Persistencia | localStorage (client) |
| IA | API routes → Anthropic (selectivo) |
| Export | MD, HTML print, JSZip |

## Principios

### 1. Venture-centric domain

Todo modelo de negocio vive en `lib/domain/venture.ts`. Los módulos extienden, no duplican.

### 2. lib/ por capacidad

```
lib/
├── intelligence/
├── discovery/
├── venture-simulator/
├── build-plan/
├── export/
├── brain/
├── dna/
└── workers/
```

Un módulo = una carpeta con `types.ts`, lógica, `index.ts` público.

### 3. Contratos explícitos

- Tipos exportados en `index.ts`
- Workers implementan interfaz `Worker`
- Sin `any` en boundaries públicas

### 4. IA reemplazable

```typescript
// Patrón: real + mock comparten forma
if (apiKey) return await generateWithAI();
return generateMock();
```

### 5. Fallback graceful

El flujo **siempre completa** sin API key. La IA mejora calidad, no habilita existencia.

### 6. Client-first v0.1

localStorage para velocidad de iteración. Cloud migration detrás de interfaces (`VentureStore`, `DNAStore`).

### 7. No romper exports

Cambios en venture shape requieren migración o defaults para ventures antiguos.

### 8. Build debe pasar

`npm run build` es gate obligatorio en cada sprint.

### 9. Documentación viva

- `docs/brain/` — especificación cognitiva
- `docs/master-plan/` — estrategia plataforma
- Código comentado solo para lógica no obvia

### 10. Minimizar scope por sprint

Un sprint = una capacidad vertical. No rediseñar UI completa salvo sprint dedicado.

## Patrones UI

| Patrón | Uso |
|--------|-----|
| Server Components | Pages estáticas |
| Client Components | Interactividad, localStorage |
| Panels por sección | Venture Workspace (simulator, build-plan) |
| Glass + CSS vars | Consistencia visual sin UI library pesada |

## API routes

| Ruta | Método | Rol |
|------|--------|-----|
| `/api/generate/research` | POST | Research worker IA |
| `/api/generate/product` | POST | Product worker IA |

Futuras APIs detrás de auth y rate limits.

## Testing (roadmap)

| v0.1 | v2+ |
|------|-----|
| Manual + build | Unit tests en lib/ |
| | E2E críticos (idea → venture) |

## Deuda técnica conocida

| Item | Plan |
|------|------|
| localStorage only | Abstract store → Supabase cuando se autorice |
| Heurísticas en código | Migrar reglas a config/Brain |
| Sin middleware auth | v2+ con accounts |
| CSS monolítico | OK hasta v3; luego modularizar |

## Prohibiciones

- No conectar providers IA nuevos sin sprint dedicado
- No tocar Supabase hasta sprint explícito
- No hardcodear métricas de mercado
- No commits de secrets

## Code review checklist

- [ ] Tipos actualizados
- [ ] Ventures antiguos compatibles
- [ ] Export no roto
- [ ] `npm run build` pasa
- [ ] Sin cambios funcionales en sprint de docs
