# ForgeOS Master Program 2030

**Versión:** 2030.0.0  
**Capa:** Governance & Program Architecture  
**Estado:** Activo (organizacional — sin wiring en app)

## Resumen

El Master Program 2030 es la capa de gobernanza que organiza ForgeOS en **5 programas** alineados con los **9 pilares** de `lib/platform/`. No introduce features de usuario ni cambia rutas; define contratos, mapeos y reglas para todo módulo existente en `lib/`.

## Jerarquía de entrega

```
Vision → Program → Epic → Feature → Release → Build
```

Ver [methodology.md](./methodology.md).

## Los 5 programas

| # | Programa | ID | Estado | Pilares |
|---|----------|-----|--------|---------|
| 1 | Venture Core | `venture-core` | active | strategy, product, studio |
| 2 | Venture Execution | `venture-execution` | active | build |
| 3 | Venture Intelligence | `venture-intelligence` | scaffold | intelligence, ceo |
| 4 | Venture Platform | `venture-platform` | scaffold | studio, launch, growth |
| 5 | Venture Ecosystem | `venture-ecosystem` | scaffold | capital |

## Implementación

```
lib/programs/
├── index.ts          # bootstrapProgramsRegistry()
├── types.ts          # contratos compartidos
├── registry.ts       # registro central
├── constants.ts      # PROGRAM_VERSION, principios
├── mapping.ts        # program ↔ pillar ↔ module
├── methodology.ts    # helpers de jerarquía
└── venture-*/        # un directorio por programa
```

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [vision.md](./vision.md) | Visión del Master Program |
| [principles.md](./principles.md) | Principios de gobernanza |
| [methodology.md](./methodology.md) | Metodología de entrega |
| [success-definition.md](./success-definition.md) | 10 criterios de éxito |
| [technical-rules.md](./technical-rules.md) | Reglas técnicas |
| [pillar-program-mapping.md](./pillar-program-mapping.md) | Mapeo pilar ↔ programa |
| [governance.md](./governance.md) | Regla: ningún módulo fuera de programas |
| [delivery-template.md](./delivery-template.md) | Plantilla de informes de entrega |
| [program-1-venture-core.md](./program-1-venture-core.md) | Programa 1 |
| [program-2-venture-execution.md](./program-2-venture-execution.md) | Programa 2 |
| [program-3-venture-intelligence.md](./program-3-venture-intelligence.md) | Programa 3 |
| [program-4-venture-platform.md](./program-4-venture-platform.md) | Programa 4 |
| [program-5-venture-ecosystem.md](./program-5-venture-ecosystem.md) | Programa 5 |

## Relación con platform

- `lib/platform/` — 9 pilares técnicos (v1.0 scaffold)
- `lib/programs/` — 5 programas de gobernanza (v2030.0.0)
- `bootstrapProgramsRegistry()` invoca `bootstrapPlatformRegistry()` para alinear registros

## Alineación con roadmaps

- Complementa `docs/platform/13_master_roadmap.md`
- Complementa `docs/master-plan/17_roadmap_v1_to_v10.md`
