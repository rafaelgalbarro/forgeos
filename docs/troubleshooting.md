# ForgeOS — Troubleshooting

Guía operativa para errores recurrentes del entorno local.

---

## Error: `Cannot find module './331.js'`

### Síntoma

```
Cannot find module './331.js'
Require stack:
  .next/server/webpack-runtime.js
  .next/server/pages/_document.js
  .next/server/app/dashboard/page.js
```

### Causa probable

**Caché de webpack/Next desincronizada en `.next`**, no un bug de código en el dashboard.

Factores que lo provocan en ForgeOS:

1. **Varias instancias de `next dev`** compitiendo en los puertos 3000/3001.
2. **Mezclar `npm run build` y `npm run dev`** sin limpiar `.next` (artefactos de producción + dev).
3. **Procesos zombie** de Node tras cerrar terminales sin `Ctrl+C`.
4. **Hot reload** tras cambios grandes (p. ej. `globals.css`) con un servidor ya corrupto.

La referencia a `pages/_document.js` en el stack **no significa** que el proyecto use Pages Router. Es un artefacto interno de Next.js durante el error de chunks.

**No es causado por:** Tailwind (no instalado), imports circulares en `lib/portfolio`, ni JSZip (solo se carga dinámicamente en export ZIP, fuera del path del dashboard).

### Solución rápida (30 segundos)

```powershell
npm run reset:dev
```

Esto mata puertos 3000/3001, borra `.next` y `node_modules/.cache`, y arranca un único `next dev` en el puerto 3000.

Abre: **http://localhost:3000/dashboard**

Hard refresh en el navegador: `Ctrl+Shift+R`

### Solución completa

```powershell
npm run doctor
npm run kill:ports
npm run clean
npm install
npm run build
npm run reset:dev
```

Usa `npm run build` + `npm run start` si quieres probar producción local — **no** mezcles con `dev` sin `reset:dev` entre medias.

### Comandos recomendados

| Comando | Cuándo usarlo |
|---------|----------------|
| `npm run reset:dev` | **Arranque canónico** tras errores o al empezar el día |
| `npm run doctor` | Diagnóstico antes de investigar más |
| `npm run kill:ports` | Solo liberar 3000/3001 |
| `npm run clean` | Solo borrar `.next` y caché |
| `npm run check` | Doctor + build de verificación |
| `npm run build` | Build de producción (después usar `start`, no `dev`) |
| `npm run start` | Servir build de producción en puerto 3000 |

### Qué NO hacer

- **No** lanzar varios `next dev` en paralelo (varias terminales, Cursor tasks, etc.).
- **No** usar `npm run dev -- -p 3000` en Windows (PowerShell interpreta mal el puerto). Usar `npm run reset:dev` o `npm run dev`.
- **No** ejecutar `npm run dev` inmediatamente después de `npm run build` sin `npm run clean` o `reset:dev`.
- **No** mezclar `next start` y `next dev` al mismo tiempo.
- **No** asumir que el error es de `pages/_document` ni tocar código de producto para "arreglarlo".

---

## Múltiples instancias de Next

### Comprobar puertos (Windows)

```powershell
netstat -ano | findstr "LISTENING" | findstr ":3000 :3001"
```

### Liberar puertos

```powershell
npm run kill:ports
```

---

## CSS sin estilos en dashboard

Suele ser el mismo problema de caché/chunks. `/_next/static/css/app/layout.css` devuelve 404 cuando `.next` está corrupto.

**Solución:** `npm run reset:dev` + hard refresh.

---

## Versión de Next.js

ForgeOS usa **Next.js 15.5.19** (App Router). El error de chunks es un problema operativo de caché, no exclusivo de esta versión.

Si persistiera tras seguir esta guía:

- **Opción A (recomendada):** Mantener 15.5.19 y usar siempre `reset:dev`.
- **Opción B:** Fijar versión exacta en `package.json` (`"next": "15.5.19"` sin `^`) para evitar drift en `npm install`.
- **Opción C:** Bajar a Next 14.2.x — más conservador pero pierde mejoras de React 19 / App Router 15. **No hacer sin decisión explícita.**

---

## Flujo de trabajo estable

```
Desarrollo diario:
  npm run reset:dev
  → http://localhost:3000/dashboard

Verificar build:
  npm run check

Probar producción local:
  npm run build
  npm run start
  → http://localhost:3000/dashboard
```
