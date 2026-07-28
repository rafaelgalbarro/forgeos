# Consentimiento — Program 9000 Intelligence Network

## Modelo

Consentimiento **opt-in por ámbito** con persistencia en **localStorage**.

### Ámbitos

| Ámbito | Descripción |
|--------|-------------|
| `benchmarks` | Contribuir métricas de benchmark agregadas |
| `signals` | Contribuir señales de mercado |
| `best-practices` | Contribuir mejores prácticas |
| `trends` | Contribuir tendencias de industria |
| `opportunities` | Contribuir oportunidades detectadas |

### Estados

- `pending` — sin decisión (default)
- `granted` — consentimiento otorgado
- `denied` — consentimiento denegado/revocado

## Storage key

```
forgeos-intelligence-network-consent
```

Formato: `{ organizationId }::{ workspaceId }` → `IntelligenceConsentRecord`

## API

```typescript
import {
  getWorkspaceConsent,
  setWorkspaceConsentScope,
  grantWorkspaceConsent,
  revokeWorkspaceConsent,
  canContributeFromWorkspace,
} from "@/lib/intelligence-network";
```

## Env

| Variable | Default | Efecto |
|----------|---------|--------|
| `NETWORK_CONSENT_REQUIRED` | `true` | Bloquea contribución sin consentimiento |

## UI

`PrivacyConsentBanner` en todas las rutas de red:

- `/network`
- `/network-insights`
- `/benchmarks`
- `/playbooks`

## Derechos GDPR

Ver `gdpr-policy.ts` — derecho de acceso, revocación, minimización y portabilidad de preferencias.
