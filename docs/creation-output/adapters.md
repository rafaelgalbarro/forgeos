# Adapters

Thin adapters in `lib/creation-output/adapters/` transform factory outputs to `CreationOutput`.

| Adapter | Reuses |
|---------|--------|
| `venture-output-adapter.ts` | Venture E2E fixture registry |
| `website-output-adapter.ts` | Website Factory `createWebsiteProject`, `generateWebsitePreview` |
| `application-output-adapter.ts` | Application Factory `createAppProject`, `runFullPipeline`, `generatePreviewApp` |
| `mobile-output-adapter.ts` | Mobile Factory `createMobileProject`, `generateExpoPreview` |
| `backend-output-adapter.ts` | Generic demo fixtures (no DB engine) |
| `deployment-output-adapter.ts` | Cloud Foundation adapter via mission-control |

## Rules

- Dynamic imports only
- Minimal public interface changes to factories
- No venture-specific motor logic in adapters
