/** Program 4500 — Functional navigable preview app generator. */

import type {
  AppProject,
  PreviewApp,
  PreviewPage,
  PreviewSection,
  FrontendPages,
  AdminPanel,
} from "./types";

const PRIMARY_COLOR = "#2563eb";

function buildDashboardSections(name: string): PreviewSection[] {
  return [
    {
      type: "hero",
      title: `Bienvenido a ${name}`,
      data: { subtitle: "Panel de control — métricas en tiempo real" },
    },
    {
      type: "stats",
      data: {
        items: [
          { label: "Total items", value: "128", trend: "+12%" },
          { label: "Activos", value: "94", trend: "+5%" },
          { label: "Usuarios", value: "24", trend: "+2" },
          { label: "Pendientes", value: "8", trend: "-3" },
        ],
      },
    },
    {
      type: "list",
      title: "Actividad reciente",
      data: {
        items: [
          { text: "Nuevo item creado — Proyecto Alpha", time: "Hace 5 min" },
          { text: "Usuario admin actualizó permisos", time: "Hace 12 min" },
          { text: "Exportación completada — 45 registros", time: "Hace 1 h" },
        ],
      },
    },
  ];
}

function buildItemsSections(): PreviewSection[] {
  return [
    {
      type: "table",
      title: "Listado de items",
      data: {
        columns: ["Título", "Estado", "Responsable", "Fecha"],
        rows: [
          ["Proyecto Alpha", "Activo", "Ana García", "12/07/2026"],
          ["Tarea Beta", "Pendiente", "Carlos Ruiz", "11/07/2026"],
          ["Revisión Gamma", "Completado", "María López", "10/07/2026"],
          ["Deploy Delta", "En progreso", "Pedro Sánchez", "09/07/2026"],
        ],
      },
    },
  ];
}

function buildItemDetailSections(): PreviewSection[] {
  return [
    {
      type: "card-grid",
      title: "Detalle del item",
      data: {
        cards: [
          { label: "Título", value: "Proyecto Alpha" },
          { label: "Estado", value: "Activo" },
          { label: "Responsable", value: "Ana García" },
          { label: "Descripción", value: "Implementación del módulo principal con integración Supabase." },
        ],
      },
    },
    {
      type: "form",
      title: "Acciones",
      data: { fields: ["Editar", "Duplicar", "Archivar", "Eliminar"] },
    },
  ];
}

function buildLoginSections(name: string): PreviewSection[] {
  return [
    {
      type: "form",
      title: `Iniciar sesión — ${name}`,
      data: {
        fields: ["Email", "Contraseña"],
        actions: ["Iniciar sesión", "¿Olvidaste tu contraseña?", "Crear cuenta"],
      },
    },
  ];
}

function buildRegisterSections(name: string): PreviewSection[] {
  return [
    {
      type: "form",
      title: `Crear cuenta — ${name}`,
      data: {
        fields: ["Nombre completo", "Email", "Contraseña", "Confirmar contraseña"],
        actions: ["Registrarse", "Ya tengo cuenta"],
      },
    },
  ];
}

function buildSettingsSections(): PreviewSection[] {
  return [
    {
      type: "form",
      title: "Configuración de perfil",
      data: {
        fields: ["Nombre", "Email", "Notificaciones", "Tema (claro/oscuro)"],
        actions: ["Guardar cambios"],
      },
    },
  ];
}

function buildAdminSections(admin: AdminPanel): PreviewSection[] {
  return [
    {
      type: "stats",
      data: {
        items: [
          { label: "Usuarios totales", value: "24", trend: "+3" },
          { label: "Sesiones activas", value: "8", trend: "" },
          { label: "Eventos auditoría", value: "156", trend: "+12" },
        ],
      },
    },
    {
      type: "list",
      title: "Secciones admin",
      data: {
        items: admin.sections.map((s) => ({ text: s.title, time: s.route })),
      },
    },
  ];
}

function buildAdminUsersSections(): PreviewSection[] {
  return [
    {
      type: "table",
      title: "Gestión de usuarios",
      data: {
        columns: ["Nombre", "Email", "Rol", "Estado"],
        rows: [
          ["Ana García", "ana@example.com", "admin", "Activo"],
          ["Carlos Ruiz", "carlos@example.com", "user", "Activo"],
          ["María López", "maria@example.com", "user", "Activo"],
          ["Pedro Sánchez", "pedro@example.com", "viewer", "Inactivo"],
        ],
      },
    },
  ];
}

function pagesFromFrontend(
  name: string,
  frontend: FrontendPages,
  admin: AdminPanel
): PreviewPage[] {
  const pageBuilders: Record<string, () => PreviewSection[]> = {
    dashboard: () => buildDashboardSections(name),
    items: () => buildItemsSections(),
    "item-detail": () => buildItemDetailSections(),
    login: () => buildLoginSections(name),
    register: () => buildRegisterSections(name),
    settings: () => buildSettingsSections(),
    admin: () => buildAdminSections(admin),
    "admin-users": () => buildAdminUsersSections(),
  };

  return frontend.pages.map((p) => ({
    id: p.slug,
    slug: p.slug,
    title: p.title,
    layout: p.layout,
    content: pageBuilders[p.slug]?.() ?? [{ type: "hero", title: p.title }],
  }));
}

export function generatePreviewApp(project: AppProject): PreviewApp {
  const name = project.name;
  const frontend = project.frontend!;
  const admin = project.admin!;

  const pages = pagesFromFrontend(name, frontend, admin);

  const navItems = pages
    .filter((p) => p.layout === "default")
    .map((p) => ({
      label: p.title,
      pageId: p.id,
      icon: p.id === "dashboard" ? "📊" : p.id === "items" ? "📋" : p.id === "settings" ? "⚙️" : "📄",
    }));

  return {
    appName: name,
    primaryColor: PRIMARY_COLOR,
    pages,
    navItems,
    authPages: pages.filter((p) => p.layout === "auth").map((p) => p.id),
    adminPages: pages.filter((p) => p.layout === "admin").map((p) => p.id),
    defaultPageId: "dashboard",
  };
}

export function formatPreviewSummary(preview: PreviewApp): string {
  return `${preview.pages.length} páginas navegables · ${preview.navItems.length} rutas`;
}

export function getPreviewPageById(preview: PreviewApp, pageId: string): PreviewPage | undefined {
  return preview.pages.find((p) => p.id === pageId);
}

export function resolvePreviewNavigation(
  preview: PreviewApp,
  fromPageId: string,
  targetSlug: string
): string {
  const target = preview.pages.find((p) => p.slug === targetSlug || p.id === targetSlug);
  if (target) return target.id;

  if (targetSlug === "login" || targetSlug === "/login") {
    return preview.authPages[0] ?? fromPageId;
  }
  if (targetSlug === "admin" || targetSlug === "/admin") {
    return preview.adminPages[0] ?? fromPageId;
  }

  return preview.defaultPageId;
}
