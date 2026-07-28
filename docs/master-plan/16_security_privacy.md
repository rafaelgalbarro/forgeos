# 16 — Seguridad y privacidad

## Principio rector

ForgeOS maneja **ideas de negocio sensibles**. La confianza es requisito, no feature opcional.

## Datos que maneja ForgeOS

| Dato | Sensibilidad | v0.1 |
|------|--------------|------|
| ideaText | Alta | localStorage |
| Discovery answers | Alta | localStorage |
| Research / PRD | Alta | localStorage |
| API keys usuario | Crítica | No almacenadas |
| ANTHROPIC_API_KEY | Crítica | Server env only |

## Modelo de amenazas (borrador)

| Amenaza | Impacto | Mitigación v0.1 | Mitigación futura |
|---------|---------|-----------------|-------------------|
| XSS en venture content | Robo ideas | React escape, pre tags | CSP estricta |
| API key leak | Abuso IA | Solo server-side | Vault, rotation |
| localStorage leak | Acceso local | Disclaimers | Auth + encryption |
| Prompt injection | IA manipulada | Sanitización básica | Guardrails por worker |
| Export accidental | Fuga info | Usuario controla export | Watermarks enterprise |

## Privacidad por diseño

1. **Datos del venture son del fundador** — no se usan para entrenar sin opt-in explícito
2. **Minimización** — solo persistir lo necesario para el flujo
3. **Transparencia** — indicar dónde viven los datos (local vs cloud)
4. **Borrado** — usuario puede eliminar venture (roadmap: delete completo)
5. **Anonimización** — marketplace solo con exports scrubbed

## IA y datos

| Regla | Detalle |
|-------|---------|
| API calls | idea + contexto van a Anthropic si key configurada |
| Sin key | Mock local, nada sale del servidor |
| Logs | No loggear ideaText completo en producción |
| Retención | Política según proveedor IA — documentar en ToS |

## Autenticación (roadmap)

| Versión | Modelo |
|---------|--------|
| v0.1 | Sin auth — single user browser |
| v2 | Email magic link o OAuth |
| v4 | Workspace con members |
| v9 | SSO enterprise (SAML) |

## Compliance (orientativo)

| Marco | Aplicabilidad | Notas |
|-------|---------------|-------|
| GDPR | Si usuarios EU | Consent, export, delete |
| SOC2 | Enterprise v9+ | Hipótesis — requiere auditoría |
| AI Act EU | Futuro | Transparencia en recomendaciones |

**Forge Legal (módulo)** nunca sustituye asesoría legal humana.

## Seguridad en Build Plan / exports

- Exports contienen datos del venture — usuario responsable de compartir
- Prompts pueden incluir contexto sensible — aviso en UI copy
- ZIP sin encriptación por defecto — enterprise puede requerir password

## Incident response (borrador)

1. Detectar (monitoring v4+)
2. Contener (revocar keys, disable worker)
3. Notificar usuarios afectados
4. Post-mortem en Decision Log interno

## Checklist pre-launch cloud

- [ ] Auth implementado
- [ ] HTTPS everywhere
- [ ] RLS o equivalente en DB
- [ ] Rate limiting APIs
- [ ] Secrets en vault
- [ ] Privacy policy + ToS
- [ ] Data export/delete endpoints

## v0.1 disclaimer

Datos en localStorage del navegador — **no hay backup cloud**. El usuario asume riesgo de limpiar browser.
