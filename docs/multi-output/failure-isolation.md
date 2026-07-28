# Failure Isolation

Mobile fails → website/backend continue. Mission not fully failed.

## Behavior

1. Failed output marked `fallido` with `blockedReason`
2. `repairPlan` generated: ["Revisar dependencias", "Reintentar generación", ...]
3. Plan status → `PARTIAL` (not `FAILED`)
4. Other outputs in same batch may succeed if isolated
5. Impact shown in Mission Control deliverables panel (🔴 health dot)

## Implementation

```typescript
// output-coordinator.ts
catch (err) {
  plan = markOutputFailed(plan, kind, msg, repairPlan);
  errors.push({ kind, error: msg });
}
// Plan continues with remaining batches
```

## UI

- Studio tree map shows blocked nodes with reason
- MC panel shows blocked count
- "Generar todos los entregables aprobados" skips failed, retries planificados
