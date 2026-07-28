# Install Flow — Registry Only

PROGRAM 4700 install is **metadata registration only**. It does NOT:

- Spin up new AI agents
- Modify `lib/ai-runtime/` internals
- Execute tasks via AI Runtime

## Storage

Install state persists in browser `localStorage`:

```
Key: forgeos:agents-marketplace:installed
Shape: { records: InstallRecord[], updatedAt: ISO string }
```

## InstallRecord

```typescript
interface InstallRecord {
  agentId: string;
  installedAt: string;
  version: string;
}
```

## Client Flow

1. User opens `/marketplace/agents/[agentId]`
2. `AgentInstallPanel` (lazy client component) reads localStorage
3. **Instalar** → writes record with current version
4. **Desinstalar** → removes record

## Server Rendering

SSR uses `getServerInstallState()` which always returns `not-installed`.
Client hydration updates the panel from localStorage.

## Future

Production install may sync to workspace persistence; current scope is local registry fixture.
