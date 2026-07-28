# Preview Flow

## After Build Passes

1. Assign free port (3100–3999)
2. Start dev server (`npm run dev` or express/expo)
3. Health check `http://127.0.0.1:<port>/`
4. Poll up to 15 attempts × 2s
5. Status → `READY` or `DEGRADED`

## Preview URL

Always `http://127.0.0.1:<port>` — never public network.

## Studio Embed

`PreviewIframe` component embeds localhost URL with sandbox attributes.

## Mobile (Expo)

- Validate project structure
- If `EXPO_TOKEN` or `EXPO_PUBLIC_PROJECT_ID`: degraded Expo preview
- Otherwise: **Preview Plan only** — no fake QR

## Actions

- Restart — stop + new sandbox
- Stop — kill process
- Retry Build — restart sandbox
- Limpiar sandbox — cleanup workspace
