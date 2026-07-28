# Security Enterprise

Centro de seguridad demo en `/admin`.

## Componentes

- **MFA** — toggle stub (`security-center.ts`)
- **SSO** — configuración ready sin IdP real (`sso-engine.ts`)
- **SCIM** — provisioning stub (`scim-engine.ts`)
- **API Keys** — creación y revocación demo
- **Webhooks** — endpoints mock

## Security Score

Heurística 0–100 basada en MFA, SSO, SCIM, API keys y auditoría.

Ver también [compliance.md](./compliance.md) y [audit.md](./audit.md).
