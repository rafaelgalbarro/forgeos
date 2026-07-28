/** Program 4500 — Frontend pages/components structure generator. */

import type { FrontendPages, PRD } from "./types";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function generateFrontendPages(name: string, prd: PRD): FrontendPages {
  const slug = slugify(name);

  return {
    framework: "nextjs",
    pages: [
      { slug: "dashboard", title: "Dashboard", route: "/dashboard", component: "DashboardPage", requiresAuth: true, layout: "default" },
      { slug: "items", title: "Listado", route: `/${slug}`, component: "ItemsListPage", requiresAuth: true, layout: "default" },
      { slug: "item-detail", title: "Detalle", route: `/${slug}/[id]`, component: "ItemDetailPage", requiresAuth: true, layout: "default" },
      { slug: "login", title: "Iniciar sesión", route: "/login", component: "LoginPage", requiresAuth: false, layout: "auth" },
      { slug: "register", title: "Registro", route: "/register", component: "RegisterPage", requiresAuth: false, layout: "auth" },
      { slug: "settings", title: "Configuración", route: "/settings", component: "SettingsPage", requiresAuth: true, layout: "default" },
      { slug: "admin", title: "Admin", route: "/admin", component: "AdminDashboard", requiresAuth: true, layout: "admin" },
      { slug: "admin-users", title: "Usuarios", route: "/admin/users", component: "AdminUsersPage", requiresAuth: true, layout: "admin" },
    ],
    components: [
      "AppShell", "Sidebar", "TopBar", "DataTable", "StatCard",
      "ItemForm", "ConfirmDialog", "EmptyState", "LoadingSpinner",
    ],
    sharedLayout: "app/(app)/layout.tsx",
  };
}

export function formatFrontendSummary(frontend: FrontendPages): string {
  return `${frontend.pages.length} páginas · ${frontend.components.length} componentes`;
}
