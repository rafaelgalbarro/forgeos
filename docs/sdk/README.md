# ForgeOS SDK (RC9)

Developer surface for ecosystem extensions.

## Modules

| Module | Package |
|--------|---------|
| Core | `@forgeos/sdk-core` |
| Marketplace | `@forgeos/sdk-marketplace` |
| Plugins | `@forgeos/sdk-plugins` |
| Ventures | `@forgeos/sdk-ventures` |
| AI | `@forgeos/sdk-ai` |

## Usage

```typescript
import { listSdkModules, getSdkQuickStart } from "@/lib/sdk";

const qs = getSdkQuickStart("sdk-marketplace");
```

All SDK operations run in sandbox mode by default.

See [api.md](./api.md).
