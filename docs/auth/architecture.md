# Identity Platform — Architecture

## Capas

```
UI (login, register, profile, settings, workspace)
        ↓
AuthProvider (React context)
        ↓
lib/auth/auth-service.ts
        ↓
AuthProvider adapter (local | supabase | authjs)
        ↓
lib/workspace/store.ts (persistence swappable)
```

## Desacoplamiento

- **Runtime / Mesh / Skills** — sin imports directos a auth
- **AI Runtime** — solo `lib/auth/ai-context-bridge.ts` extiende contexto
- **Enterprise RC11** — `lib/enterprise/organization-engine` es multi-tenant distinto de `lib/workspace/`

## Seguridad (Sprint 1)

- Contraseñas hasheadas SHA-256 en cliente (local adapter)
- Sesión en `localStorage` — **no producción**; migrar a httpOnly cookies en Sprint 2
- Email verify / forgot password — demo tokens en UI
- Sin secrets en código

## Sprint 2 (futuro)

- Supabase Auth SDK integration
- Auth.js route handler `/api/auth/[...nextauth]`
- Server session middleware
- Workspace sync a DB
