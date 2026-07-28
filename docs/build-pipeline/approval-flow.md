# Flujo de aprobación — Build Pipeline

## Secuencia

```
Dry-run → Risk Check → Human Approval → (opcional) Real Execution → Audit
```

## Capas involucradas

1. **Build Pipeline** (`lib/build-pipeline/`) — orquesta el flujo completo
2. **Real Build Flow** (`lib/real-build-flow/`) — pasos GitHub/Supabase/Vercel
3. **Real Execution** (`lib/real-execution/`) — sesiones de aprobación RC5.1
4. **Connections** (`lib/connections/`) — adapters seguros por proveedor

## Estados de aprobación

| Estado | Descripción |
|--------|-------------|
| `pending` | Sesión creada, esperando fundador/CTO |
| `approved` | Aprobada — permite ejecución real (si flags activas) |
| `rejected` | Rechazada — pipeline bloqueado |
| `expired` | Expirada — requiere nueva solicitud |

## Flags requeridas para ejecución real

Todas deben ser `true` explícitamente:

```env
ENABLE_REAL_BUILD_FLOW=true
ENABLE_REAL_EXECUTION=true
ENABLE_REAL_GITHUB_EXECUTION=true   # según proveedor
ENABLE_REAL_VERCEL_EXECUTION=true
ENABLE_REAL_SUPABASE_EXECUTION=true
REAL_BUILD_REQUIRE_APPROVAL=true
REAL_EXECUTION_REQUIRE_APPROVAL=true
```

## API de aprobación

```bash
# 1. Dry-run
POST /api/build-pipeline/dry-run
{ "requestedBy": "cto" }

# 2. Solicitar aprobación
POST /api/build-pipeline/request-approval
{ "requestedBy": "cto" }

# 3. Aprobar (reutiliza RC5.1)
POST /api/real-build-flow/approve
{ "sessionId": "...", "approvedBy": "founder" }

# 4. Ejecutar (solo con flags + aprobación)
POST /api/real-build-flow/execute
{ "approvalSessionId": "...", "userConfirmed": true }
```

## Garantías de seguridad

- Producción siempre bloqueada en validadores
- DNS apply, delete repo, push to main — prohibidos
- `userConfirmed: true` obligatorio para ejecución real
- Auditoría en cada transición de estado
