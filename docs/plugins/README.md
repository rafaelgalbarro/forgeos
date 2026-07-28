# ForgeOS Plugins (RC9)

Plugin catalog and sandbox loader.

## Routes

- `/plugins` — plugin browser
- `/lab/ecosystem` — CRM demo with plugin deps

## API

```typescript
import { listPlugins, simulatePluginLoad } from "@/lib/plugins";

const result = simulatePluginLoad('eco-plugin-crm-sync');
// { loaded: true, mode: 'sandbox', hooksRegistered: [...] }
```

See [sandbox.md](./sandbox.md).
