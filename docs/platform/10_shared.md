# Shared Layer (`lib/platform/shared/`)

## Módulos

| Archivo | Propósito |
|---------|-----------|
| `types.ts` | `PlatformId`, `VentureId`, `PillarId`, `PillarEngine`, `PillarDescriptor` |
| `constants.ts` | Nombres, versiones y descripciones de pilares |
| `errors.ts` | `PlatformError`, `PillarNotReadyError`, `PillarNotFoundError` |
| `ids.ts` | Generadores de IDs |
| `helpers.ts` | `nowIso`, `stubAsync`, `emptyArray` |
| `events.ts` | Bus de eventos in-memory (stub) |
| `registry.ts` | `registerPillar`, `getPillar`, `listPillars` |

## Contrato PillarEngine

```ts
interface PillarEngine {
  readonly id: PillarId;
  readonly status: PillarStatus; // 'scaffold' | 'ready'
  initialize(ventureId: VentureId): Promise<void>;
  getCapabilities(): ModuleId[];
  healthCheck(): Promise<PillarHealthCheck>;
}
```

## Registro central

`shared/registry.ts` no contiene lógica de negocio — solo almacena descriptors. `bootstrapPlatformRegistry()` en `lib/platform/index.ts` registra los 9 pilares.

## Event bus

Stub síncrono para futura orquestación. No conectado a `lib/fos/event-bus` en v1.0.
