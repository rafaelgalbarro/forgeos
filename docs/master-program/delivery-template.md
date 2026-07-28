# Plantilla de informe de entrega

Usar esta estructura para cada épica completada. Tipo TypeScript: `DeliveryReport` en `lib/programs/types.ts`.

---

## Programa

_Nombre del programa Master Program 2030 (ej. Master Program 2030)_

## Épica

_Nombre de la épica (ej. Program Architecture Layer)_

## Objetivo

_Descripción clara del objetivo de la entrega._

## Archivos creados

- `ruta/archivo.ts`
- `docs/...`

## Archivos modificados

- `ruta/archivo.md` — descripción breve del cambio

## Arquitectura afectada

- Capas / módulos / pilares tocados (sin mover código salvo que sea el objetivo)

## Riesgos

- Riesgo 1 — mitigación
- Riesgo 2 — mitigación

## Compatibilidad

_Estado de rutas y módulos existentes (ej. sin breaking changes, build OK)_

## Build

```
npm run build → exit 0
npm run reset:dev → OK
HTTP 200: /, /dashboard, /projects, /design-system
```

## Próximos pasos

1. Paso siguiente 1
2. Paso siguiente 2

---

## Metadatos opcionales

| Campo | Valor |
|-------|-------|
| Fecha | YYYY-MM-DD |
| Autor | Nombre |

## Ejemplo mínimo

```yaml
programa: Master Program 2030
epica: Program Architecture Layer
objetivo: Crear lib/programs/ y docs/master-program/ sin wiring UI
archivosCreados: [lib/programs/index.ts, docs/master-program/README.md]
archivosModificados: [docs/platform/13_master_roadmap.md]
arquitecturaAfectada: [lib/programs, docs/master-program]
riesgos: [Duplicación build-plan entre programas — documentado en mapping]
compatibilidad: Sin cambios en app/ ni comportamiento UI
build: exit 0
proximosPasos: [Registrar épicas en 2030.1, lint de moduleToProgram]
```
