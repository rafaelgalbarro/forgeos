# ForgeOS Real Connections (RC5)

Secure integration layer connecting ForgeOS capabilities to external tools.

## Quick start

1. Copy env vars from `.env.example` to `.env.local` (server-side only)
2. Visit `/lab/real-connections` for the dashboard
3. Use **Test connection** for read-only credential validation
4. Use **Generate dry-run plan** to preview operations

## Key principle

**DRY_RUN by default.** No mutations without full governance chain.

See [architecture.md](./architecture.md) and [security.md](./security.md).
