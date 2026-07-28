# Platform Architecture v1.0

## Diagrama de capas

```
┌─────────────────────────────────────────┐
│           App (Next.js routes)          │  ← NO importa lib/platform
├─────────────────────────────────────────┤
│     Existing lib/* (discovery, ai, …)   │
├─────────────────────────────────────────┤
│         lib/platform/ (aislado)         │
│  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │ shared  │  │ pillars │  │adapters│ │
│  └─────────┘  └─────────┘  └────────┘ │
└─────────────────────────────────────────┘
```

## Flujo de dependencias

```
pillar/engine.ts → shared/*
pillar/engine.ts → pillar/adapters/* → lib/* (externo)
pillar/registry.ts → shared/types
lib/platform/index.ts → shared + pillar/registries (metadata)
```

**Prohibido:** `strategy → product`, `ceo → intelligence`, etc.

## Patrón adaptador

```ts
export const discoveryAdapter = {
  readonly: true,
  module: 'discovery',
  pillarId: 'strategy',
  isAvailable(): boolean { return true; },
};
```

- Preferir `import type` para evitar SSR issues.
- Sin dynamic imports.
- Sin mover código existente.

## Bootstrap

```ts
import { bootstrapPlatformRegistry, listPillars } from '@/lib/platform';
bootstrapPlatformRegistry();
```

Uso opcional — la app no lo invoca en v1.0.

## Aislamiento

El build de Next.js compila `lib/platform` como parte del proyecto TypeScript, pero ninguna página lo importa. Esto garantiza que la arquitectura evoluciona sin romper UX existente.
