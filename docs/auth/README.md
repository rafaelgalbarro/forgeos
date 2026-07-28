# Program 3000 — Identity Platform (Sprint 1)

Sistema de identidad desacoplado para ForgeOS. **No acopla** Runtime, AI Runtime, Mesh ni Skills a un proveedor concreto.

## Rutas

| Ruta | Función |
|------|---------|
| `/login` | Iniciar sesión |
| `/register` | Registro + workspace + organization |
| `/forgot-password` | Recuperar contraseña / verificar email |
| `/profile` | Perfil, avatar, logout |
| `/settings` | Preferencias usuario |
| `/workspace` | Workspace activo, ventures, contexto IA |

## Proveedores

```env
NEXT_PUBLIC_AUTH_PROVIDER=local   # default
# supabase | authjs
```

| Provider | Estado |
|----------|--------|
| `local` | Completo (localStorage + SHA-256) |
| `supabase` | Adapter listo; requiere keys |
| `authjs` | Adapter listo; requiere AUTH_SECRET |

## Modelo de datos

Cada usuario tiene:

- **User** — identidad, email, avatar
- **Workspace** — contexto de ejecución IA
- **Organization** — tenant lógico
- **Ventures** — IDs vinculados al workspace
- **Preferences** — locale, theme, IA optimizer

## IA y Workspace

Toda llamada a `/api/ai/run` puede incluir `workspaceContext`. El bridge `mergeWorkspaceIntoAiContext` inyecta scope sin modificar el pipeline core.

```ts
import { getActiveWorkspaceContext } from "@/lib/workspace";
import { workspaceContextFromActive } from "@/lib/auth";

const ctx = workspaceContextFromActive(getActiveWorkspaceContext());
// POST /api/ai/run { ..., workspaceContext: ctx }
```

## API

```ts
import { login, register, logout, getSession } from "@/lib/auth";
import { getActiveWorkspaceContext, updateUserPreferences } from "@/lib/workspace";
```

## Versión

`AUTH_VERSION` = 3000.1.0
