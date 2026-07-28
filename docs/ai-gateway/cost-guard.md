# Cost Guard

`lib/ai-gateway/cost-guard.ts` protege contra inputs excesivos.

## Límites

- Máximo ~120.000 caracteres combinados (system + user)
- Truncado con warning si se supera
- Máximo 3 llamadas paralelas (`withConcurrencyLimit`)

## Respuesta

Los warnings se incluyen en `AIGatewayResponse.warnings`.
`costEstimate` usa estimación heurística de tokens (chars/4).
