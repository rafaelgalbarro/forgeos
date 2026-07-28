import { seedMeta, slugId } from "../seed-helpers";
import type { FeatureEntry } from "./types";

function feature(
  name: string,
  description: string,
  tags: string[],
  workers: string[],
  priority: FeatureEntry["priority"] = "should"
): FeatureEntry {
  return {
    id: slugId("feature", name),
    domain: "features",
    title: name,
    description,
    tags,
    ...seedMeta(workers),
    priority,
    userStories: [`Como usuario quiero ${name.toLowerCase()} para completar mi objetivo principal.`],
    acceptanceCriteria: [`${name} funciona en el flujo principal`, "Manejo de errores visible", "Mobile-friendly si aplica"],
  };
}

export const FEATURE_CATALOG: FeatureEntry[] = [
  feature("Auth", "Registro, login, recuperación de contraseña y sesiones seguras.", ["saas", "web", "mobile", "b2b", "b2c"], ["product", "backend", "frontend"], "must"),
  feature("Dashboard", "Vista principal con KPIs, accesos rápidos y estado del sistema.", ["dashboard", "saas", "b2b"], ["product", "ux", "frontend"], "must"),
  feature("Payments", "Cobros, suscripciones, facturas y webhooks de pago.", ["saas", "marketplace", "subscription"], ["product", "backend", "legal"], "must"),
  feature("Notifications", "Email, push e in-app para eventos críticos.", ["mobile", "saas", "b2c"], ["product", "backend"], "should"),
  feature("Chat", "Mensajería en tiempo real entre usuarios o con soporte.", ["marketplace", "b2c", "mobile"], ["product", "backend"], "should"),
  feature("Calendar", "Disponibilidad, reservas y sincronización de eventos.", ["marketplace", "mobile", "b2c"], ["product", "ux"], "should"),
  feature("Search", "Búsqueda full-text, filtros y ordenación de resultados.", ["marketplace", "saas", "dashboard"], ["product", "backend"], "should"),
  feature("File upload", "Subida, almacenamiento y permisos de archivos.", ["saas", "b2b", "web"], ["product", "backend"], "should"),
  feature("AI assistant", "Copiloto conversacional con contexto del producto.", ["ai", "saas", "web"], ["product", "cto", "backend"], "could"),
  feature("Admin panel", "Gestión interna de usuarios, contenido y configuración.", ["saas", "b2b", "marketplace"], ["product", "ux", "frontend"], "should"),
  feature("Roles & permissions", "RBAC con roles, permisos y auditoría básica.", ["saas", "b2b", "erp", "crm"], ["product", "backend"], "must"),
  feature("Marketplace listings", "Publicación, edición y moderación de listados.", ["marketplace", "b2c"], ["product", "ux"], "must"),
  feature("Reviews", "Valoraciones, comentarios y reputación.", ["marketplace", "b2c"], ["product", "ux"], "should"),
  feature("Subscriptions", "Planes, upgrades, cancelaciones y proration.", ["subscription", "saas", "freemium"], ["product", "backend", "marketing"], "must"),
  feature("Analytics", "Eventos, funnels, cohortes y exportación.", ["dashboard", "saas", "b2b"], ["product", "marketing", "frontend"], "should"),
];
