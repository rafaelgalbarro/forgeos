import { seedMeta, slugId } from "../seed-helpers";
import type { UxEntry, UxPatternType } from "./types";

function ux(
  title: string,
  description: string,
  patternType: UxPatternType,
  tags: string[],
  screens: string[],
  principles: string[]
): UxEntry {
  return {
    id: slugId("ux", title),
    domain: "ux",
    title,
    description,
    tags,
    ...seedMeta(["ux", "product", "frontend"]),
    patternType,
    screens,
    principles,
  };
}

export const UX_CATALOG: UxEntry[] = [
  ux("Onboarding", "Primeros pasos guiados con valor inmediato y progreso visible.", "onboarding", ["saas", "b2c", "mobile"], ["Welcome", "Setup", "First win"], ["Time-to-value < 5 min", "Máximo 3 pasos críticos"]),
  ux("Login", "Autenticación clara con SSO opcional y recuperación simple.", "flow", ["web", "saas", "b2b"], ["Login", "Forgot password", "SSO"], ["Errores accionables", "Sin fricción innecesaria"]),
  ux("Dashboard", "Jerarquía visual de KPIs, acciones primarias y estados vacíos útiles.", "layout", ["dashboard", "saas", "b2b"], ["Overview", "Detail drill-down"], ["Un KPI north-star", "Carga progresiva"]),
  ux("Wizard", "Flujo paso a paso para tareas complejas con guardado parcial.", "flow", ["saas", "b2b", "erp"], ["Stepper", "Review", "Confirm"], ["Indicador de progreso", "Validación inline"]),
  ux("Marketplace listing", "Ficha de producto/servicio con fotos, precio, CTA y confianza.", "component", ["marketplace", "b2c"], ["Listing card", "Detail page"], ["Prueba social", "CTA único claro"]),
  ux("Checkout", "Pago en pocos pasos con resumen, impuestos y confirmación.", "flow", ["marketplace", "subscription", "b2c"], ["Cart", "Payment", "Receipt"], ["Minimizar abandono", "Transparencia de precio"]),
  ux("Settings", "Preferencias agrupadas por tema con cambios reversibles.", "layout", ["saas", "web", "b2b"], ["Account", "Billing", "Notifications"], ["Confirmación en cambios críticos"]),
  ux("Profile", "Identidad del usuario, avatar, bio y actividad reciente.", "component", ["b2c", "mobile", "marketplace"], ["Profile view", "Edit profile"], ["Privacidad por defecto"]),
  ux("Admin panel", "Gestión interna con tablas, filtros, bulk actions y audit trail.", "layout", ["saas", "b2b", "marketplace"], ["Users", "Moderation", "Config"], ["RBAC visible", "Acciones destructivas confirmadas"]),
  ux("AI chat interface", "Conversación con contexto, sugerencias y citas de fuentes.", "component", ["ai", "saas", "web"], ["Chat", "History", "Sources"], ["Streaming", "Fallback humano"]),
];
