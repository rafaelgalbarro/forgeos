# Analytics — Customer Success Platform

## Fuentes de datos

1. **Design Partner Analytics** (`forgeos-dp-analytics`) — eventos `dp_*`
2. **Beta Analytics** (`forgeos-beta-analytics`) — eventos beta
3. **Sesiones CS** (`forgeos-cs-sessions`) — stub de sesiones
4. **Heatmaps** (`forgeos-cs-heatmap`) — estructura stub sin SDK

## API

```ts
import {
  getProductMetrics,
  getSessionSummary,
  getConversionFunnels,
  getFeatureAdoptionMetrics,
  trackDesignPartnerPageView,
} from "@/lib/customer-success";
```

## Métricas de producto

`getProductMetrics()` devuelve:

- `totalEvents` — suma DP + beta
- `topPaths` — rutas más visitadas
- `topEvents` — eventos más frecuentes

## Embudos

`getConversionFunnels()` calcula tasas de conversión entre etapas del journey (extiende `journey-tracker`).

## Adopción de funciones

`getFeatureAdoptionMetrics()` agrupa eventos DP por tipo y calcula tasa de adopción vs cohorte landing.

## Telemetría AI

Solo **lectura** de `lib/ai-runtime/telemetry` vía `ai-usage-analytics.ts`. No crea motores AI nuevos.
