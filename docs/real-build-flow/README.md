# ForgeOS Real Build Flow (RC5.2)

**RC5.2 First Real Build Flow COMPLETADO EN MODO PREVIEW/DRY-RUN.**

Transforms a Venture into a preview-deployable project using Build Platform + Real Connections + RC5.1 approval layer.

## Default

`ENABLE_REAL_BUILD_FLOW=false` → dry-run only.

## Flow

See `architecture.md` for the 16-step pipeline.

## Lab

`/lab/real-build-flow`

## API

- `POST /api/real-build-flow/dry-run`
- `POST /api/real-build-flow/request-approval`
- `POST /api/real-build-flow/approve`
- `POST /api/real-build-flow/execute`
