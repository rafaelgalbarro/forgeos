# ForgeOS Intelligence Network — Program 9000

Red de inteligencia colectiva con **aislamiento total org/workspace**: solo agregados anonimizados compartidos.

**Todos los outputs están etiquetados como "Simulación con datos demo" hasta que exista red real.**

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/network` | Dashboard principal de red colectiva |
| `/network-insights` | Insights ejecutivos, patrones y recomendaciones |
| `/benchmarks` | Benchmarks agregados y anonimizados |
| `/playbooks` | Biblioteca de playbooks de la red |
| `/lab/network` | Harness de ingeniería RC10 (legacy) |

## Privacidad (CRÍTICO)

- **NO** se comparten datos privados
- **NO** se mezclan organizaciones ni workspaces
- **NO** se exponen datos sensibles
- Consentimiento explícito por ámbito (`consent-engine` + localStorage)
- Anonimización en estadísticas agregadas (`anonymization.ts`)
- Capas de aislamiento: workspace, organización, GDPR, enterprise policies

## Módulos Program 9000

```
lib/intelligence-network/
├── network-intelligence.ts   # Orquestador principal
├── benchmark-engine.ts       # Benchmarks (extiende RC10 + venture-intelligence)
├── market-signals.ts
├── industry-trends.ts
├── anonymous-metrics.ts
├── pattern-recognition.ts
├── playbook-library.ts
├── best-practices.ts
├── knowledge-federation.ts
├── executive-insights.ts
├── ai-recommendations.ts
├── opportunity-detection.ts
├── sector-analysis.ts
├── growth-signals.ts
├── network-dashboard.ts
├── consent-engine.ts         # localStorage
├── anonymization.ts
├── workspace-isolation.ts
├── organization-isolation.ts
├── gdpr-policy.ts
├── enterprise-policies.ts
├── config.ts
├── types.ts
└── index.ts

components/intelligence-network/
├── NetworkDashboard.tsx
├── NetworkInsightsPanel.tsx
├── BenchmarksPanel.tsx
├── PlaybookLibraryPanel.tsx
├── PrivacyConsentBanner.tsx
└── AnonymizedMetricsPanel.tsx
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `ENABLE_INTELLIGENCE_NETWORK` | `false` | Habilita red de inteligencia |
| `NETWORK_CONSENT_REQUIRED` | `true` | Consentimiento explícito obligatorio |
| `ENABLE_ANONYMIZED_BENCHMARKS` | `true` | Benchmarks anonimizados |

## Documentación

- [privacy.md](./privacy.md) — Reglas de privacidad y aislamiento
- [benchmarks.md](./benchmarks.md) — Motor de benchmarks
- [consent.md](./consent.md) — Motor de consentimiento

## Relación con RC10

Program 9000 extiende `lib/network/` (RC10) sin modificar motores core. La capa RC10 sigue disponible para compatibilidad.
