# Cómo crear una épica

## Cuándo crear una épica

Toda entrega significativa en `lib/` o `docs/` que afecte un programa del Master Program 2030 debe registrarse como épica operativa en `lib/delivery/epic-registry.ts`.

## Pasos

### 1. Definir la épica

Campos mínimos (`EpicRecord`):

| Campo | Descripción |
|-------|-------------|
| `id` | Identificador único (kebab-case, ej. `2030-1-delivery-system`) |
| `title` | Nombre legible |
| `objective` | Objetivo en una frase |
| `programId` | Uno de los 5 programas |
| `status` | `draft` → `planned` → `in_progress` → `done` |

### 2. Registrar en el epic registry

```typescript
import { registerEpic } from "@/lib/delivery";

registerEpic({
  id: "2030-1-delivery-system",
  programId: "venture-core",
  title: "Program Governance & Delivery System",
  objective: "lib/delivery/ + docs sin wiring UI",
  status: "in_progress",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
```

### 3. Asignar a programa

Cada épica pertenece a **exactamente un** programa:

| ProgramId | Nombre |
|-----------|--------|
| `venture-core` | Venture Core |
| `venture-execution` | Venture Execution |
| `venture-intelligence` | Venture Intelligence |
| `venture-platform` | Venture Platform |
| `venture-ecosystem` | Venture Ecosystem |

```typescript
import { assignEpicToProgram } from "@/lib/delivery";

assignEpicToProgram("2030-1-delivery-system", "venture-core");
```

La asignación valida contra `PROGRAM_IDS` en `lib/programs/constants.ts`. IDs inválidos lanzan error.

### 4. Documentar alcance

Antes de implementar, documentar en la épica o en PR:

- Objetivo
- Alcance / fuera de alcance
- Módulos scaffold afectados (si aplica)

## Separación de registries

| Registry | Ubicación | Uso |
|----------|-----------|-----|
| Epic scaffold en descriptor | `lib/programs/*/program.ts` | Arquitectura estática del programa |
| Epic registry operativo | `lib/delivery/epic-registry.ts` | Entregas reales y tracking |

No confundir ambos: el operativo es la fuente de verdad para gobernanza de entrega 2030.1+.

## Checklist

- [ ] ID único definido
- [ ] Programa owner identificado (tabla pillar-program-mapping)
- [ ] Objetivo escrito
- [ ] `registerEpic()` llamado (script/CI/manual)
- [ ] Sin wiring a `app/` si la épica es solo lib/docs
