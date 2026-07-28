/** Program 4500 — PRD generator from user description. */

import type { PRD } from "./types";

function extractFeatures(description: string): string[] {
  const keywords = ["gestión", "dashboard", "usuarios", "reportes", "notificaciones", "búsqueda", "filtros", "exportar"];
  const found = keywords.filter((k) => description.toLowerCase().includes(k));
  const defaults = ["Autenticación de usuarios", "Dashboard principal", "CRUD de entidades", "Panel de administración"];
  return found.length >= 2 ? [...new Set([...found.map((f) => f.charAt(0).toUpperCase() + f.slice(1)), ...defaults.slice(0, 2)])] : defaults;
}

export function generatePRD(name: string, description: string): PRD {
  const trimmed = description.trim() || "Aplicación web con gestión de datos y panel de administración.";
  const features = extractFeatures(trimmed);

  return {
    title: name,
    description: trimmed,
    audience: "Equipos y usuarios finales que necesitan gestionar datos de forma eficiente",
    goals: [
      "Centralizar la gestión de datos en una interfaz intuitiva",
      "Reducir tiempo operativo con automatizaciones",
      "Ofrecer visibilidad mediante dashboards y reportes",
    ],
    features,
    userStories: [
      `Como usuario, quiero iniciar sesión de forma segura para acceder a ${name}`,
      `Como administrador, quiero gestionar usuarios y permisos`,
      `Como usuario, quiero ver un dashboard con métricas clave`,
      `Como usuario, quiero crear, editar y eliminar registros`,
    ],
    successMetrics: [
      "Tiempo de onboarding < 5 minutos",
      "Disponibilidad > 99.5%",
      "Satisfacción de usuario > 4/5",
    ],
  };
}

export function formatPRDSummary(prd: PRD): string {
  return `${prd.features.length} features · ${prd.userStories.length} user stories`;
}
