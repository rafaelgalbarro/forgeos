# Benchmarks — Program 9000 Intelligence Network

## Descripción

Motor de benchmarks agregados y anonimizados que extiende:

- `lib/network/benchmark-engine.ts` (RC10)
- `lib/venture-intelligence/benchmark-engine.ts` (heurístico VI)

## Activación

Controlado por `ENABLE_ANONYMIZED_BENCHMARKS` (default: `true`).

Si está deshabilitado, el motor devuelve un resultado vacío con disclaimer demo.

## Métricas incluidas

| Métrica | Fuente |
|---------|--------|
| Crecimiento MRR | RC10 sector benchmarks |
| Precio plan principal | RC10 vs venture |
| Churn mensual | RC10 agregado |
| CAC | RC10 agregado |
| ARR (heurístico VI) | Venture Intelligence |

## Privacidad

- Solo valores en buckets (redondeo a decenas)
- `sampleSize` mínimo de 5 para evitar re-identificación
- Sin nombres de venture ni org en outputs de red

## UI

- `/benchmarks` — página dedicada
- `BenchmarksPanel` — componente embebido en dashboard

## Disclaimer

Todos los benchmarks llevan `"Simulación con datos demo"` hasta red real con consentimiento.
