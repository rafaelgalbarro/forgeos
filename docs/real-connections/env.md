# Environment Variables

## Required (server-side only)

```env
GITHUB_TOKEN=
SUPABASE_ACCESS_TOKEN=
VERCEL_TOKEN=
CLOUDFLARE_API_TOKEN=
```

## Production flag

```env
FORGEOS_CONNECTIONS_PRODUCTION=false
```

Set to `true` only when ready for governed production execution. RC5 adapters still block direct mutations as an additional safety layer.

## Security notes

- Never prefix connection tokens with `NEXT_PUBLIC_`
- Never store tokens in localStorage or client state
- Tokens are read exclusively by `lib/connections/security/credential-store.ts`
- All API responses pass through `secret-redaction.ts`

## Token scopes (recommended minimum)

| Provider | Scopes |
|----------|--------|
| GitHub | `repo` (read), `read:user` |
| Supabase | Management API access |
| Vercel | Read projects + deploy (when production enabled) |
| Cloudflare | Zone DNS read (write only when production enabled) |
