# Security — Preview Runtime

## Prohibited

- Arbitrary shell commands (`&&`, `|`, `;`, backticks)
- Destructive scripts (`rm -rf`, `format`, `sudo`)
- External paths outside sandbox
- Production credentials (`.env.local`, service role keys)
- Public network exposure (non-localhost preview URLs)
- Public deploy (`npm publish`, `deploy`)
- Git clone, wget/curl pipe to shell

## Environment

```env
NODE_ENV=development
PREVIEW_MODE=true
ENABLE_REAL_EXECUTION=false
ENABLE_REAL_AI=false
```

Only manifest-declared vars with demo/sandbox values. ForgeOS `.env.local` is never copied.

## Iframe Sandbox

```html
<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
```

- No parent DOM access
- No shared cookies with ForgeOS
- localhost URLs only

## Dependency Validation

Blocked before install:

- High-risk native packages (puppeteer, sqlite3, etc.)
- Git refs, direct URLs, local packages outside sandbox
- Suspicious postinstall scripts

## Resource Limits

Default limits stop sandbox and log event:

| Limit | Default |
|-------|---------|
| Memory | 512 MB |
| Duration | 10 min |
| Disk | 256 MB |
| Processes | 8 |
| Ports | 1 |
