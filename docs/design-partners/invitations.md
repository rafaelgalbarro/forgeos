# Invitations — Design Partners

## Tipos de invitación

### Beta (existente — Sprint 6)

Códigos demo en `lib/beta-platform/invitations.ts`:

- `FORGE-BETA-2026`
- `FORGE-FOUNDER-VIP`

API: `validateInvitationCode()`, `redeemInvitation()`

### Organización

Storage key: `forgeos-dp-org-invitations`

Demo: `FORGE-ORG-DP2026` para `partner@forgeos.local`

API:

- `createOrgInvitation({ orgId, orgName, email })`
- `acceptOrgInvitation(code, email?)` — fallback a beta redemption si no encuentra código org

### Workspace

Storage key: `forgeos-dp-workspace-invitations`

Demo: `FORGE-WS-ALPHA` para workspace Partner Alpha

API:

- `createWorkspaceInvitation({ workspaceId, workspaceName, email, role? })`
- `acceptWorkspaceInvitation(code, email?)`

## Flujo recomendado

1. Admin crea invitación org para el partner
2. Partner acepta y se une a waitlist/beta flow
3. Admin invita al workspace específico del partner
4. Partner accede con rol `admin` o `member`

## Integración auth/workspace

Las invitaciones no modifican auth directamente — el partner debe registrarse vía `/register` tras canjear. El estado se refleja en `journey-tracker` etapa `invite` → `register`.

## Métricas

`getPendingInviteCount()` agrega invitaciones org + workspace con status `pending`.
