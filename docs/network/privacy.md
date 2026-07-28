# Privacidad — Program 9000 Intelligence Network

## Principios

1. **Sin datos privados** — emails, teléfonos, claves API, datos de clientes nunca salen de la organización.
2. **Aislamiento por organización** — cada org opera en su propio contexto; no hay mezcla de datos.
3. **Aislamiento por workspace** — cada workspace tiene fronteras propias dentro de la org.
4. **Consentimiento explícito** — toda contribución a la red requiere consentimiento por ámbito (localStorage).
5. **Anonimización** — las estadísticas agregadas pasan por bucketing y hash de org ID.
6. **Etiquetado demo** — todos los outputs llevan `"Simulación con datos demo"` hasta red real.

## Capas Program 9000

| Capa | Archivo | Función |
|------|---------|---------|
| Consentimiento | `consent-engine.ts` | Gate por ámbito + persistencia localStorage |
| Anonimización | `anonymization.ts` | Bucketing, strip PII, solo agregados |
| Workspace | `workspace-isolation.ts` | Fronteras por workspace |
| Organización | `organization-isolation.ts` | Sin mezcla cross-org |
| GDPR | `gdpr-policy.ts` | Verificaciones de cumplimiento |
| Enterprise | `enterprise-policies.ts` | Políticas enterprise gates |

## Default: sin salida de datos

Por defecto (`NETWORK_CONSENT_REQUIRED=true`):

- Ningún dato sale del workspace sin consentimiento explícito
- Las vistas de red muestran **solo agregados anonimizados**
- Revocación disponible en cualquier momento (localStorage)

## Campos prohibidos

Heredado de RC10 `privacy-layer.ts`:

- email, phone, address
- customerName, customerEmail
- apiKey, password, token, secret, privateKey
- bankAccount, ssn, dni, cif

## Flujo de contribución

```
Org/workspace solicita contribuir
  → consent-engine: ¿consentimiento otorgado? (localStorage)
  → workspace-isolation + organization-isolation: ¿fronteras OK?
  → anonymization: anonimizar métricas
  → gdpr-policy + enterprise-policies: verificaciones
  → Si OK: contribución aceptada (demo: in-memory)
  → Si NO: rechazada con motivo
```

## Estado actual

Program 9000 opera en **modo demo** (`dryRunOnly: true`). No hay red real ni transmisión de datos entre organizaciones.
