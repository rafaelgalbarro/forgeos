# API Strategy

## Principio

La plataforma v1.0 **no expone HTTP APIs nuevas**. Toda la superficie es TypeScript interno en `lib/platform/`.

## Evolución propuesta

### v2 — Platform SDK interno

```ts
// Futuro — no implementado
const platform = createPlatform({ ventureId });
await platform.strategy.initialize();
const snapshot = await platform.strategy.getSnapshot();
```

### v3 — REST/Edge API

| Endpoint | Pilar | Notas |
|----------|-------|-------|
| `GET /api/platform/pillars` | shared | Lista descriptors |
| `GET /api/platform/:pillar/health` | * | Health check |
| `POST /api/platform/:pillar/initialize` | * | Idempotente |

### Autenticación

Reutilizar auth de app cuando exista — no inventar en v1.

### Versionado

Header `X-Forge-Platform-Version: 1.0.0` alineado con `PLATFORM_VERSION`.

## Reglas

1. No nuevas APIs en v1.0 scaffold
2. Adapters primero, HTTP después
3. OpenAPI spec cuando REST llegue a v3
