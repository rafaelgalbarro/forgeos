# ForgeOS RC1 — Architecture

## Vista general

ForgeOS RC1 integra tres programas en una plataforma coherente orientada al recorrido del fundador.

```mermaid
flowchart TB
  subgraph Founder["Founder Experience (P3)"]
    F1["/founder"]
    F2["/creator"]
    F3["/founder-journey"]
    F4["/venture/id"]
    F5["/venture/id/timeline"]
    F6["/venture/id/knowledge"]
  end

  subgraph CEO["CEO Layer"]
    C1["/ceo — CEO Workspace"]
    C2["/dashboard — CEO Office 0.3.0"]
  end

  subgraph Runtime["Runtime Kernel (P1)"]
    R1["Executive Runtime"]
    R2["State Machine"]
    R3["Workers / Task Queue"]
    R4["Execution Engine"]
    R5["Observability"]
  end

  subgraph Build["Build Platform (P2)"]
    B1["Build Context"]
    B2["Build DNA"]
    B3["Build Registry"]
    B4["Factories FE/BE/DB/QA/Infra"]
    B5["Release Manager"]
  end

  subgraph Validation["RC1 Validation"]
    V1["/lab/rc1"]
    V2["lib/lab/rc1-validation-lab.ts"]
  end

  F1 --> F2
  F2 --> F3
  F3 --> C1
  C1 --> F4
  F4 --> F5
  F4 --> F6

  F4 --> B1
  B1 --> B2 --> B3 --> B4 --> B5

  C1 --> R1
  R1 --> R2 --> R3 --> R4 --> R5

  V2 --> F4
  V2 --> B1
  V2 --> B5
  V1 --> V2
```

## Capas

### Runtime (Program 1)

Motor de ejecución ejecutivo: CEO + Board + Consensus + Decision Graph. Labs en `/lab/executive-runtime` y subsistemas (workers, task-queue, execution-engine, observability).

### Build Platform (Program 2)

Pipeline de construcción: contexto → ADN → registro → factories → release manager. Cada epic expone un lab en `/lab/*`.

### Founder Experience (Program 3)

Experiencia del fundador: captura de idea, journey de 15 fases, workspace por venture, timeline y knowledge hub.

## Datos

| Store | Ubicación | Alcance |
|-------|-----------|---------|
| Ventures | `localStorage` (`forgeos-ventures`) | Portfolio del usuario |
| VANDL fixture | `lib/fixtures/vandl-venture.ts` | E2E demo (read-only) |
| Build Context | In-memory (`context-store`) | Labs / validación |
| Intelligence | In-memory / mock AI | Sin persistencia real |

## Componentes clave

- `lib/venture-workspace/` — snapshot del workspace
- `lib/founder-journey/` — motor de 15 fases
- `lib/ceo-workspace/` — datos CEO Workspace
- `lib/rc1-integration/routes.ts` — mapa de cross-links
- `components/venture-workspace/VentureWorkspaceView.tsx` — UI unificada
