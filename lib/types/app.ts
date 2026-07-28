export type AppCategory =
  | "saas"
  | "marketplace"
  | "dashboard"
  | "reservas"
  | "mobile"
  | "ecommerce";

export type AppPriority = "low" | "medium" | "high";

export type AppStatus = "draft" | "generating" | "ready" | "archived";

export interface AppDraft {
  id: string;
  name: string;
  description: string;
  category: AppCategory;
  targetAudience: string;
  priority: AppPriority;
  template?: string;
  status: AppStatus;
  createdAt: string;
  updatedAt: string;
}

export const APP_CATEGORIES: { value: AppCategory; label: string }[] = [
  { value: "saas", label: "SaaS" },
  { value: "marketplace", label: "Marketplace" },
  { value: "dashboard", label: "Dashboard" },
  { value: "reservas", label: "Reservas" },
  { value: "mobile", label: "Mobile App" },
  { value: "ecommerce", label: "E-commerce" },
];

export const APP_PRIORITIES: { value: AppPriority; label: string }[] = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
];

export const APP_TEMPLATES: { value: string; label: string }[] = [
  { value: "", label: "Sin plantilla" },
  { value: "saas-basic", label: "SaaS básico" },
  { value: "marketplace", label: "Marketplace" },
  { value: "reservas", label: "Reservas" },
  { value: "dashboard", label: "Dashboard" },
  { value: "mobile-expo", label: "Mobile Expo" },
];

export function createEmptyAppDraft(): AppDraft {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    category: "saas",
    targetAudience: "",
    priority: "medium",
    template: "",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}
