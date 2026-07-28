# Definition of Done — qué significa "terminado"

Una épica o release está **terminado** cuando cumple todos los criterios siguientes.

## Criterios obligatorios

### 1. Registro

- [ ] Épica registrada en `lib/delivery/epic-registry.ts`
- [ ] Asignada a uno de los 5 programas
- [ ] Release(s) registrados si la épica se dividió

### 2. Alcance cumplido

- [ ] Objetivo de la épica alcanzado
- [ ] Fuera de alcance respetado (sin wiring no autorizado)
- [ ] Sin features de producto ni cambios UI no solicitados

### 3. Quality gates

- [ ] `npm run build` → exit 0
- [ ] `npm run reset:dev` documentado/ejecutado
- [ ] Rutas críticas HTTP 200 verificadas
- [ ] Sin imports prohibidos en `components/dashboard`
- [ ] Sin barrels pesados nuevos
- [ ] Sin lógica de negocio nueva en componentes React
- [ ] UI nueva alineada con FHIS (si aplica)
- [ ] Scaffold no conectado prematuramente a `app/`

### 4. Documentación

- [ ] `DeliveryReport` completo generado
- [ ] `validateDeliveryReport()` sin errores
- [ ] Riesgos documentados (mínimo uno, aunque sea "Sin riesgos identificados")
- [ ] Plan de rollback definido
- [ ] Próximo paso explícito

### 5. Compatibilidad

- [ ] Sin breaking changes en rutas existentes
- [ ] `lib/delivery` no importado por `app/` ni `components/`
- [ ] `lib/programs/types.ts` no roto (contrato parcial preservado)

## No cuenta como terminado

| Situación | Motivo |
|-----------|--------|
| Build falla | Gate 1 no pasa |
| Rutas críticas 404/500 | Gate 3 no pasa |
| Import de `lib/platform` en dashboard | Gate 4 no pasa |
| Scaffold conectado sin épica/release | Gate 8 no pasa |
| Informe sin riesgos ni rollback | Validación falla |
| Solo código sin informe | Sin contrato de entrega |

## Status transitions

```
Epic:    draft → planned → in_progress → done
Release: planned → in_progress → released
```

Marcar `done` / `released` solo tras gates + informe.

## Referencia

- Gates: [03_quality_gates.md](./03_quality_gates.md)
- Informe: [04_delivery_reports.md](./04_delivery_reports.md)
- Sistema completo: [../master-program/2030_1_delivery_system.md](../master-program/2030_1_delivery_system.md)
