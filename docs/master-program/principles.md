# Principios — Master Program 2030

## Principios oficiales

Definidos en `lib/programs/constants.ts` como `PROGRAM_PRINCIPLES`:

### 1. Decision First

Toda épica y feature debe vincularse a una decisión explícita. Las decisiones viven en intelligence-layer y en el decision log del master-plan.

### 2. Founder Centric

El diseño de programas prioriza el flujo del founder: descubrir → validar → definir producto → construir → lanzar → crecer.

### 3. No Module Outside Programs

**Regla absoluta:** ningún módulo nuevo en `lib/` puede existir sin asignación a un programa. Ver [governance.md](./governance.md).

### 4. Pillar Alignment

Cada programa declara `linkedPillarIds[]` alineados con `lib/platform/`. Un módulo puede referenciar múltiples pilares vía su programa.

### 5. Incremental Delivery

Entregas pequeñas, reversibles, con informe de delivery. Sin big-bang refactors.

### 6. Zero Breaking Changes

La capa de programas no rompe Dashboard, Discovery, Intelligence, Research, Product, Simulator, Build Plan, Export ni FHIS.

### 7. Documentation as Contract

La documentación en `docs/master-program/` es contrato de gobernanza. Cambios de programa requieren actualización de docs.

### 8. Scaffold Before Wire

Módulos desconectados (CEO, Board, FOS) permanecen como scaffold hasta aprobación explícita en roadmap.

## Aplicación práctica

| Situación | Acción |
|-----------|--------|
| Nuevo módulo en `lib/` | Asignar programa + actualizar `mapping.ts` + docs |
| Nueva feature UI | Verificar programa owner; no importar `lib/programs` en `app/` |
| Conectar CEO/Board | Épica en Venture Intelligence + aprobación roadmap |
| Módulo compartido (ej. build-plan) | Documentar en ambos programas; una sola implementación |
