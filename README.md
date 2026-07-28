# ForgeOS App Factory v0.1

ForgeOS es una plataforma interna para convertir ideas en productos digitales completos con ayuda de agentes IA.

## Qué incluye esta versión

- Dashboard inicial
- Catálogo de ideas
- Pantalla **Nueva App** (formulario funcional con guardado local)
- Biblioteca de plantillas
- Sistema de agentes IA
- Abstracciones para proveedores IA (stub, OpenAI, Anthropic)
- Prompts maestros para Cursor/Claude
- Documentación de producto
- Modelo de datos inicial

## Cómo ejecutar

Requisito: Node.js 18+ (o usar el portable en `%LOCALAPPDATA%\node-portable`).

```bash
cd Projects/ForgeOS_App_Factory/ForgeOS_App_Factory_v0_1
npm install
npm run dev
```

Abrir en navegador: [http://localhost:3000](http://localhost:3000)

### Pantallas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Landing |
| `/dashboard` | Panel central |
| `/new-app` | Crear nueva app |
| `/projects` | Proyectos guardados |
| `/ideas` | Catálogo de ideas |
| `/templates` | Plantillas base |
| `/agents` | Agentes IA |

## Configuración IA (futuro)

Copia `.env.example` a `.env.local` y configura las claves cuando estés listo:

```
NEXT_PUBLIC_AI_PROVIDER=stub
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

El proveedor `stub` está activo por defecto — no hace llamadas externas.

## Stack

- Next.js 15 + TypeScript
- CSS custom (sin framework UI)
- localStorage para borradores de apps

## Próximo paso

Conectar el formulario de Nueva App con `getAIProvider().generatePRD()` para generar el primer PRD con IA real.
