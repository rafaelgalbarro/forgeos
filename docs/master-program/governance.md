# Gobernanza — Master Program 2030

## Regla fundamental

> **Ningún módulo fuera de programas.**

Todo código en `lib/` (excepto infraestructura transversal explícita) debe pertenecer a uno de los 5 programas del Master Program 2030.

## Alcance

### Dentro de gobernanza

- Nuevos directorios en `lib/`
- Nuevos adapters en `lib/platform/`
- Extensiones de intelligence-layer, build-engine, etc.

### Excepciones documentadas

| Path | Razón |
|------|-------|
| `lib/programs/shared/` | Contratos transversales de programas |
| `lib/platform/shared/` | Contratos transversales de pilares |

## Proceso para nuevo módulo

1. Identificar programa owner (tabla en [pillar-program-mapping.md](./pillar-program-mapping.md))
2. Añadir entrada en `lib/programs/<program>/modules.ts`
3. Añadir entrada en `lib/programs/mapping.ts` → `moduleToProgram`
4. Actualizar README del programa y doc correspondiente
5. Si afecta pilar: actualizar adapter en `lib/platform/` (scaffold OK)

## Proceso para módulo compartido

Ejemplo: `lib/build-plan` usado por venture-core y venture-execution.

- Una sola implementación — no duplicar
- Documentar en ambos `modules.ts` con nota de referencia cruzada
- Owner primario en `moduleToProgram`: venture-core
- venture-execution lista el módulo como referencia

## Enforcement

| Nivel | Mecanismo |
|-------|-----------|
| 2030.0 | Documentación + code review |
| 2030.1+ | Lint rule / CI check de `mapping.ts` |
| 2031+ | Registry obligatorio en PR template |

## Relación con platform governance

- **Platform** define pilares técnicos y adapters
- **Programs** define ownership y entrega
- Un cambio de pilar sin programa owner es **rechazado**

## Escalation

Si un módulo no encaja en ningún programa:

1. Proponer nuevo programa (requiere revisión de arquitectura)
2. O reasignar a programa existente con épica documentada
3. Nunca dejar módulo huérfano en `lib/`
