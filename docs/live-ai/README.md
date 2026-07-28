# Live AI Operations Center — RC5.5

Centro de operaciones visual que muestra cómo todas las IA de ForgeOS colaboran en un pipeline simulado.

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/live` | Centro de operaciones principal (fundador / demo) |
| `/lab/live-ai` | Harness de ingeniería con KPIs y validación |

## Uso

1. Abre `/live`
2. Escribe un comando como **"Crea una startup de gestión de flotas"**
3. Pulsa **Iniciar simulación**
4. Observa el pipeline animado en los 13 paneles

## Modo dry-run

- **Sin ejecución real** — no se llaman APIs externas ni `runExecutiveProtocol` en producción
- Los datos de Runtime (task queue, workers, observability) se cargan desde los lab harnesses cuando están disponibles
- Fallback a datos mock si el runtime no está accesible

## Módulos

- `lib/live-ai/` — motor de simulación, tipos, bridge a runtime
- `components/live-ai/` — UI del centro de operaciones
- `lib/lab/live-ai-lab.ts` — harness de lab

## Documentación

- [architecture.md](./architecture.md) — decisiones de arquitectura
- [flow.md](./flow.md) — flujo del pipeline simulado
