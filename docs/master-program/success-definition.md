# Definición de éxito — Master Program 2030

## 10 criterios

### 1. Registro completo

Los 5 programas están registrados vía `bootstrapProgramsRegistry()` con descriptors válidos.

### 2. Mapeo pilar-programa

Todo pilar de `lib/platform/` tiene al menos un programa asignado en `mapping.ts`.

### 3. Mapeo módulo-programa

Todo módulo `lib/*` relevante tiene entrada en `moduleToProgram` o está documentado como futuro.

### 4. Sin imports cruzados entre programas

Los subdirectorios `venture-*/` solo importan desde `shared/` y `lib/platform/shared/`.

### 5. Sin wiring en app

`app/` y `components/` no importan `lib/programs/`.

### 6. Build limpio

`npm run build` termina con exit code 0.

### 7. Rutas críticas operativas

HTTP 200 en `/`, `/dashboard`, `/projects`, `/design-system`.

### 8. Documentación completa

Los 13 documentos en `docs/master-program/` existen y están enlazados.

### 9. Compatibilidad preservada

Dashboard, Discovery, Intelligence, Research, Product, Simulator, Build Plan, Export y FHIS sin cambios de comportamiento.

### 10. Scaffold explícito

CEO, Board, FOS, Capital y Marketplace marcados como `scaffold` o `disconnected` — sin conexión UI oculta.

## Verificación

```bash
npm run build
npm run reset:dev
# Verificar HTTP 200 en rutas críticas
```

## Métricas futuras (2030.1+)

- % módulos con programa asignado
- Épicas con delivery report
- Tiempo medio Vision → Build por programa
